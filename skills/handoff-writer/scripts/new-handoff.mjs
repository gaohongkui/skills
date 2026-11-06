#!/usr/bin/env node
/**
 * Scaffold a HANDOFF.md skeleton with the section order handoff-writer enforces.
 *
 *   node scripts/new-handoff.mjs --title "Fix ingest retry loop"
 *   node scripts/new-handoff.mjs --title "..." --out docs/HANDOFF.md --force
 *
 * Refuses to overwrite an existing file unless --force is passed.
 * No network access, no dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

function flag(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    console.error(`✖ ${name} needs a value`);
    process.exit(2);
  }
  return value;
}

if (args.includes('--help') || args.includes('-h')) {
  console.log('usage: new-handoff.mjs [--title "text"] [--out HANDOFF.md] [--force]');
  process.exit(0);
}

const title = flag('--title', 'Untitled work');
const out = path.resolve(process.cwd(), flag('--out', 'HANDOFF.md'));
const force = args.includes('--force');
const today = new Date().toISOString().slice(0, 10);

if (fs.existsSync(out) && !force) {
  console.error(`✖ ${out} already exists — pass --force to overwrite, or choose another --out`);
  process.exit(1);
}

const template = `# HANDOFF — ${title}

## Goal

<One sentence: what this work must achieve.> Done = <observable finish line>.

## State

- Works: <subsystem> — verified \`<command>\` → <result>
- Broken: <what and where, with file:line>
- Not started: <what>

## Next action

1. \`<command>\` — expected: <result>
2. <edit this> at \`<file:line>\`
3. \`<command>\` — expected: <result>

## Decisions

- ${today} — <decision>. Rejected <alternative> because <reason>.

## Traps

- <trap> — <what actually happens> — <what to do instead>

## Map

- \`<path>\` — <why it matters>

## Open questions

- <question> — blocked on <person / experiment / upstream issue>
`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, template);

const lines = template.split('\n').length;
console.log(`✔ ${path.relative(process.cwd(), out) || out} (${lines} lines)`);
console.log('');
console.log('Now fill in, in this order: Goal, State, Next action.');
console.log('Every other section may stay empty — but not these three.');
console.log('Before sharing: no secrets, no personal data, no internal-only links.');
