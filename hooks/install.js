#!/usr/bin/env node
/**
 * StoneWrld PostToolUse hook installer.
 *
 * Idempotently adds an entry to ~/.claude/settings.json that wires
 * hooks/stoneworld.js into Claude Code's PostToolUse pipeline. Matcher is
 * ".*" so the hook fires on every tool call (per design/08-architecture
 * §Hook globality — earn from all work).
 *
 * SAFETY:
 *   - A timestamped backup of settings.json is written before any change.
 *   - If our entry is already present (by command-path match), this is a no-op.
 *   - Settings.json is written atomically (tmp + fsync + rename) so a kill
 *     mid-install never leaves a half-written settings file.
 *   - Existing hooks (e.g. tsc-noemit on Write|Edit|MultiEdit) are NEVER touched.
 *
 * Run via:    npm run hook:install
 * Uninstall:  npm run hook:uninstall   (reverses by removing only our entry)
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HOOK_DIR = path.dirname(fileURLToPath(import.meta.url));
const HOOK_PATH = path.join(HOOK_DIR, 'stoneworld.js');
const CLAUDE_SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');

const ENTRY_MATCHER = '.*'; // match every tool call
const ENTRY_TIMEOUT_SEC = 5; // generous; hook should finish in <50ms

function atomicWriteJson(targetPath, content) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const tmpPath = `${targetPath}.tmp.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmpPath, JSON.stringify(content, null, 2), 'utf8');
  const fd = fs.openSync(tmpPath, 'r+');
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmpPath, targetPath);
}

function backupSettings() {
  if (!fs.existsSync(CLAUDE_SETTINGS)) return null;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = `${CLAUDE_SETTINGS}.bak.${ts}`;
  fs.copyFileSync(CLAUDE_SETTINGS, backupPath);
  return backupPath;
}

function loadSettings() {
  if (!fs.existsSync(CLAUDE_SETTINGS)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(CLAUDE_SETTINGS, 'utf8'));
  } catch (err) {
    console.error(`[stonewrld-hook-install] Cannot parse ${CLAUDE_SETTINGS}:`);
    console.error(err);
    process.exit(1);
  }
}

function isOurEntry(entry) {
  // Match by command path containing our hook script — robust to quoting
  // (Claude Code wraps paths in double quotes in `command`).
  if (!entry || typeof entry !== 'object' || !Array.isArray(entry.hooks)) {
    return false;
  }
  return entry.hooks.some(
    (h) => typeof h?.command === 'string' && h.command.includes('stoneworld.js'),
  );
}

function buildEntry() {
  return {
    matcher: ENTRY_MATCHER,
    hooks: [
      {
        type: 'command',
        command: `node "${HOOK_PATH}"`,
        timeout: ENTRY_TIMEOUT_SEC,
      },
    ],
  };
}

function main() {
  if (!fs.existsSync(HOOK_PATH)) {
    console.error(
      `[stonewrld-hook-install] Hook script not found at: ${HOOK_PATH}`,
    );
    process.exit(1);
  }

  const settings = loadSettings();
  settings.hooks = settings.hooks ?? {};
  settings.hooks.PostToolUse = Array.isArray(settings.hooks.PostToolUse)
    ? settings.hooks.PostToolUse
    : [];

  const already = settings.hooks.PostToolUse.find(isOurEntry);
  if (already) {
    console.log(
      '[stonewrld-hook-install] Hook already installed — no changes made.',
    );
    console.log(`  Command: ${already.hooks[0]?.command}`);
    return;
  }

  const backup = backupSettings();
  settings.hooks.PostToolUse.push(buildEntry());
  atomicWriteJson(CLAUDE_SETTINGS, settings);

  console.log('[stonewrld-hook-install] Hook installed.');
  console.log(`  Target:  ${CLAUDE_SETTINGS}`);
  console.log(`  Script:  ${HOOK_PATH}`);
  console.log(`  Matcher: ${ENTRY_MATCHER}`);
  if (backup) {
    console.log(`  Backup:  ${backup}`);
  }
  console.log('');
  console.log('Every Claude Code tool call now earns resources for StoneWrld.');
  console.log('Refresh http://127.0.0.1:5100 after doing any work to see the tick.');
}

main();
