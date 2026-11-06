#!/usr/bin/env node
/**
 * Make every skill in this repo available to local agents.
 *
 *   node scripts/link.mjs                      # symlink into ~/.agents/skills
 *   node scripts/link.mjs --target ~/.claude/skills
 *   node scripts/link.mjs --copy               # copy instead of symlink
 *   node scripts/link.mjs --list               # show what is linked where
 *   node scripts/link.mjs --unlink             # remove links created by this repo
 *
 * Existing entries that this repo did not create are never overwritten; --force
 * renames them to <name>.backup-<timestamp> first.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

const args = process.argv.slice(2);
const copy = args.includes('--copy');
const force = args.includes('--force');
const list = args.includes('--list');
const unlink = args.includes('--unlink');

const targetArgs = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--target') {
    if (!args[i + 1]) {
      console.error('✖ --target needs a directory');
      process.exit(1);
    }
    targetArgs.push(args[i + 1]);
  }
}
const targets = (targetArgs.length ? targetArgs : [path.join(os.homedir(), '.agents', 'skills')]).map((target) =>
  target.replace(/^~(?=$|\/)/, os.homedir()),
);

const skills = fs.existsSync(SKILLS_DIR)
  ? fs
      .readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(SKILLS_DIR, entry.name, 'SKILL.md')))
      .map((entry) => entry.name)
      .sort()
  : [];

const pointsHere = (linkPath) => {
  try {
    return fs.realpathSync(linkPath) === fs.realpathSync(path.join(SKILLS_DIR, path.basename(linkPath)));
  } catch {
    return false;
  }
};

if (skills.length === 0) {
  console.error('✖ no skills found under skills/');
  process.exit(1);
}

for (const target of targets) {
  if (list) {
    if (!fs.existsSync(target)) {
      console.log(`${target}: does not exist`);
      continue;
    }
    console.log(`${target}:`);
    for (const name of skills) {
      const linkPath = path.join(target, name);
      const state = !fs.existsSync(linkPath) && !isSymlink(linkPath)
        ? 'absent'
        : pointsHere(linkPath)
          ? 'linked to this repo'
          : 'present (not from this repo)';
      console.log(`  ${name.padEnd(28)} ${state}`);
    }
    continue;
  }

  fs.mkdirSync(target, { recursive: true });
  let changed = 0;

  for (const name of skills) {
    const source = path.join(SKILLS_DIR, name);
    const linkPath = path.join(target, name);

    if (unlink) {
      if (isSymlink(linkPath)) {
        fs.unlinkSync(linkPath);
        console.log(`− ${linkPath}`);
        changed += 1;
      }
      continue;
    }

    if (isSymlink(linkPath)) {
      if (pointsHere(linkPath)) {
        console.log(`· ${linkPath} (already linked)`);
        continue;
      }
      fs.unlinkSync(linkPath);
    } else if (fs.existsSync(linkPath)) {
      if (!force) {
        console.warn(`⚠ ${linkPath} already exists and was not created by this repo — skipped (use --force)`);
        continue;
      }
      const backup = `${linkPath}.backup-${Date.now()}`;
      fs.renameSync(linkPath, backup);
      console.warn(`⚠ moved existing ${name} to ${backup}`);
    }

    if (copy) {
      fs.cpSync(source, linkPath, { recursive: true });
      console.log(`✔ copied ${name} → ${linkPath}`);
    } else {
      fs.symlinkSync(source, linkPath, 'dir');
      console.log(`✔ linked ${name} → ${linkPath}`);
    }
    changed += 1;
  }

  console.log(`\n${target}: ${changed} change(s), ${skills.length} skill(s) available`);
}

function isSymlink(target) {
  try {
    return fs.lstatSync(target).isSymbolicLink();
  } catch {
    return false;
  }
}
