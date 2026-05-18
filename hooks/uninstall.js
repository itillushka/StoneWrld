#!/usr/bin/env node
/**
 * StoneWrld PostToolUse hook uninstaller.
 *
 * Removes ONLY the StoneWrld entry from ~/.claude/settings.json
 * hooks.PostToolUse. Other entries (tsc-noemit, etc.) are preserved.
 *
 * Idempotent — running on a clean settings.json is a no-op.
 *
 * Run via: npm run hook:uninstall
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CLAUDE_SETTINGS = path.join(os.homedir(), '.claude', 'settings.json');

function atomicWriteJson(targetPath, content) {
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

function main() {
  if (!fs.existsSync(CLAUDE_SETTINGS)) {
    console.log('[stonewrld-hook-uninstall] No settings.json — nothing to do.');
    return;
  }

  const settings = JSON.parse(fs.readFileSync(CLAUDE_SETTINGS, 'utf8'));
  const before = settings.hooks?.PostToolUse?.length ?? 0;
  if (!Array.isArray(settings.hooks?.PostToolUse) || before === 0) {
    console.log('[stonewrld-hook-uninstall] No PostToolUse entries — nothing to do.');
    return;
  }

  settings.hooks.PostToolUse = settings.hooks.PostToolUse.filter((entry) => {
    if (!entry || !Array.isArray(entry.hooks)) return true;
    return !entry.hooks.some(
      (h) => typeof h?.command === 'string' && h.command.includes('stoneworld.js'),
    );
  });

  const after = settings.hooks.PostToolUse.length;
  if (after === before) {
    console.log('[stonewrld-hook-uninstall] No StoneWrld hook found — nothing to do.');
    return;
  }

  atomicWriteJson(CLAUDE_SETTINGS, settings);
  console.log(
    `[stonewrld-hook-uninstall] Removed ${before - after} entry. PostToolUse now has ${after} hook(s).`,
  );
}

main();
