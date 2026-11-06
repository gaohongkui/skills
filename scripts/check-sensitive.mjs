#!/usr/bin/env node
/**
 * Scan this repository for secrets, personal data, and internal-only references
 * before it is pushed or published. A safety net, not a substitute for reading
 * your own diff — see docs/publishing-checklist.md.
 *
 *   node scripts/check-sensitive.mjs            # whole repo
 *   node scripts/check-sensitive.mjs --staged   # only staged files (pre-commit)
 *   node scripts/check-sensitive.mjs <path...>  # specific files or directories
 *
 * Exit 0: clean. Exit 1: findings, or a tracked file that should never be committed.
 * Allowlist false positives by rule + path in .privacyignore (never paste the secret).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', 'tmp', '.work']);
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_FINDINGS_PER_FILE = 20;

const RULES = [
  { id: 'private-key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, why: 'private key material' },
  { id: 'aws-key', re: /\bAKIA[0-9A-Z]{16}\b/, why: 'AWS access key id' },
  { id: 'github-token', re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/, why: 'GitHub token' },
  { id: 'github-pat', re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/, why: 'GitHub fine-grained token' },
  { id: 'openai-key', re: /\bsk-(?:ant-)?[A-Za-z0-9_-]{24,}\b/, why: 'model provider API key' },
  { id: 'slack-token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, why: 'Slack token' },
  { id: 'google-api-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/, why: 'Google API key' },
  { id: 'jwt', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/, why: 'JSON Web Token' },
  { id: 'db-conn', re: /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s"'@/]+:[^\s"'@/]+@/, why: 'connection string with inline password' },
  { id: 'home-path', re: /(?:\/Users\/|\/home\/)[A-Za-z0-9._-]{2,}/, why: 'absolute home directory path' },
  { id: 'windows-home', re: /[A-Za-z]:\\+Users\\+[A-Za-z0-9._-]{2,}/, why: 'absolute Windows home path' },
  { id: 'email', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, why: 'email address' },
  { id: 'cn-mobile', re: /(?<!\d)1[3-9]\d{9}(?!\d)/, why: 'mobile phone number' },
  { id: 'cn-id-card', re: /\b\d{17}[\dXx]\b/, why: 'national ID number' },
  { id: 'private-ip', re: /\b(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.(?:\d{1,3}\.){2}\d{1,3}\b/, why: 'private network address' },
  { id: 'internal-host', re: /[A-Za-z0-9-]+\.(?:internal|corp|intranet|lan|local)(?![\w.])/, why: 'internal-only hostname' },
  { id: 'signed-url', re: /[?&](?:X-Amz-Signature|X-Goog-Signature|sig|token|api_key|apikey|access_token)=[A-Za-z0-9%._-]{16,}/i, why: 'credential or signature in a URL' },
];

const FORBIDDEN_NAMES = ['.env', '.DS_Store', 'id_rsa', 'id_ed25519', '.netrc', '.npmrc'];
const FORBIDDEN_EXT = ['.pem', '.key', '.p12', '.pfx', '.keystore'];

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const toPosix = (p) => p.split(path.sep).join('/');
const rel = (p) => toPosix(path.relative(ROOT, p));

function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === '*') {
      if (glob[i + 1] === '*') {
        out += '.*';
        i += 1;
        if (glob[i + 1] === '/') i += 1;
      } else {
        out += '[^/]*';
      }
    } else if (char === '?') {
      out += '[^/]';
    } else {
      out += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${out}$`);
}

function loadAllowlist() {
  const file = path.join(ROOT, '.privacyignore');
  if (!fs.existsSync(file)) return [];
  const entries = [];
  for (const rawLine of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = rawLine.replace(/(^|\s)#.*$/, '').trim();
    if (!line) continue;
    const rule = line.match(/rule=(\S+)/)?.[1];
    const pattern = line.match(/path=(\S+)/)?.[1];
    if (!pattern) continue;
    entries.push({ rule: rule ?? null, re: globToRegExp(pattern), source: line });
  }
  return entries;
}

function loadLocalPatterns() {
  const file = path.join(ROOT, '.privacy.local.json');
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return (parsed.patterns ?? [])
      .filter((entry) => typeof entry?.re === 'string')
      .map((entry) => ({
        id: entry.id ?? 'local-pattern',
        re: new RegExp(entry.re, 'g'),
        why: entry.why ?? 'local privacy pattern',
      }));
  } catch (error) {
    console.error(`✖ .privacy.local.json is not valid JSON: ${error.message}`);
    process.exit(1);
  }
}

const mask = (value) => {
  if (value.length <= 6) return '*'.repeat(value.length);
  const head = value.slice(0, Math.min(4, Math.floor(value.length / 3)));
  const tail = value.slice(-2);
  return `${head}${'*'.repeat(Math.min(12, value.length - head.length - 2))}${tail}`;
};

function collectFiles(targets) {
  const files = [];
  const walk = (target) => {
    const stat = fs.statSync(target);
    if (stat.isFile()) {
      files.push(target);
      return;
    }
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(target, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) files.push(full);
    }
  };

  if (targets.length) {
    for (const target of targets) {
      const resolved = path.resolve(ROOT, target);
      if (fs.existsSync(resolved)) walk(resolved);
    }
    return [...new Set(files)];
  }

  walk(ROOT);
  return files;
}

function stagedFiles() {
  try {
    const output = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((file) => path.join(ROOT, file))
      .filter((file) => fs.existsSync(file));
  } catch {
    console.error('✖ --staged needs a git repository');
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const staged = args.includes('--staged');
const targets = args.filter((arg) => !arg.startsWith('-'));

const allowlist = loadAllowlist();
const rules = [...RULES, ...loadLocalPatterns()];
const files = staged ? stagedFiles() : collectFiles(targets);
const findings = [];
const notes = [];

const isAllowed = (ruleId, file) =>
  allowlist.some((entry) => (entry.rule === null || entry.rule === ruleId) && entry.re.test(file));

for (const file of files.sort()) {
  const relative = rel(file);
  const name = path.basename(file);

  if (FORBIDDEN_NAMES.includes(name) || FORBIDDEN_EXT.some((ext) => name.endsWith(ext))) {
    findings.push({ file: relative, line: 0, col: 0, rule: 'forbidden-file', why: 'file type that must not be committed', match: name });
    continue;
  }

  const stat = fs.statSync(file);
  if (stat.size > MAX_FILE_BYTES) {
    notes.push(`${relative}: ${(stat.size / 1024).toFixed(0)}KB — large file, review before publishing`);
  }

  const buffer = fs.readFileSync(file);
  if (buffer.subarray(0, 8192).includes(0)) {
    notes.push(`${relative}: binary file — scanner skipped its contents`);
    continue;
  }

  const lines = buffer.toString('utf8').split('\n');
  let perFile = 0;
  for (let index = 0; index < lines.length && perFile < MAX_FINDINGS_PER_FILE; index += 1) {
    const line = lines[index];
    if (!line) continue;
    for (const rule of rules) {
      if (isAllowed(rule.id, relative)) continue;
      rule.re.lastIndex = 0;
      let match;
      while ((match = rule.re.exec(line)) !== null) {
        findings.push({
          file: relative,
          line: index + 1,
          col: match.index + 1,
          rule: rule.id,
          why: rule.why,
          match: mask(match[0]),
        });
        perFile += 1;
        if (perFile >= MAX_FINDINGS_PER_FILE) break;
        if (match[0].length === 0) rule.re.lastIndex += 1;
      }
      if (perFile >= MAX_FINDINGS_PER_FILE) break;
    }
  }
}

for (const note of notes) console.warn(`⚠ ${note}`);

if (findings.length === 0) {
  console.log(`✔ privacy scan clean — ${files.length} file(s), ${rules.length} rules`);
  process.exit(0);
}

console.error(`✖ ${findings.length} potential leak(s) in ${files.length} scanned file(s)\n`);
let lastFile = null;
for (const finding of findings) {
  if (finding.file !== lastFile) {
    console.error(`  ${finding.file}`);
    lastFile = finding.file;
  }
  const where = finding.line ? `${String(finding.line).padStart(4)}:${String(finding.col).padEnd(3)}` : '    -  ';
  console.error(`    ${where} ${finding.rule.padEnd(14)} ${finding.match}  (${finding.why})`);
}

console.error('');
console.error('Each hit needs a decision:');
console.error('  1. Remove it, or replace it with a placeholder (<REDACTED>, /path/to/…, example.com).');
console.error('  2. If it is a genuine false positive, allowlist by RULE + PATH in .privacyignore —');
console.error('     never paste the offending string there.');
console.error('  3. If it is a real secret that was already pushed, rotate it first:');
console.error('     docs/publishing-checklist.md#if-something-sensitive-already-slipped-through');
process.exit(1);
