import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Atomic JSON file write — Node-only (uses fs).
 *
 * Pattern locked in design/08-architecture §Atomic write pattern:
 *   1. Write to a tmp file (path includes PID + timestamp to avoid collisions
 *      when the hook and dev middleware write simultaneously).
 *   2. fsync the tmp file to push it past the kernel page cache — guarantees
 *      durability before the rename "commits" the write.
 *   3. POSIX `rename` is atomic — observers of the target path see either the
 *      old content or the new content, never a partial / empty file.
 *
 * On Windows, `rename` is best-effort; v1 is Linux-only per design assumptions,
 * so this is acceptable. If StoneWrld ever ships for Windows, swap to
 * `proper-lockfile` per design/08-architecture §Concurrency.
 *
 * Throws on any I/O failure — caller decides recovery (log + 500 from
 * middleware; log + exit-0 from hook to avoid blocking Claude Code).
 *
 * @param targetPath  Absolute path to the destination JSON file.
 * @param content     The JSON-serializable object to write.
 */
export async function atomicWriteJson(
  targetPath: string,
  content: unknown,
): Promise<void> {
  const dir = path.dirname(targetPath);

  // Ensure target directory exists (e.g. on first run before ~/StoneWrld/ has state.json).
  await fs.mkdir(dir, { recursive: true });

  const tmpPath = `${targetPath}.tmp.${process.pid}.${Date.now()}`;
  const payload = JSON.stringify(content, null, 2);

  // Write payload to tmp first.
  await fs.writeFile(tmpPath, payload, 'utf8');

  // fsync — push past kernel page cache so the rename "commits" durable data.
  // Without this, a power-loss could leave you with a renamed-but-empty file.
  const fh = await fs.open(tmpPath, 'r+');
  try {
    await fh.sync();
  } finally {
    await fh.close();
  }

  // Atomic rename on POSIX.
  await fs.rename(tmpPath, targetPath);
}

/**
 * Read + parse a JSON file. Returns `null` if the file doesn't exist
 * (distinguishes "missing" from "corrupt"). Throws on parse errors.
 */
export async function readJsonOrNull(
  targetPath: string,
): Promise<unknown | null> {
  try {
    const raw = await fs.readFile(targetPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return null;
    }
    throw err;
  }
}
