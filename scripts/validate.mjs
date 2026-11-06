#!/usr/bin/env node
/**
 * Validate every skill against the Agent Skills spec plus this repo's rules.
 *
 *   node scripts/validate.mjs [--quiet]
 *
 * Exit 0: no errors (warnings allowed). Exit 1: at least one error.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSkill, fold } from './lib/frontmatter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

const ALLOWED_KEYS = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];
const RESERVED_NAMES = ['synced', 'anthropic-skills'];
const CATEGORIES = ['docs', 'code', 'data', 'design', 'ops', 'meta'];
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

const quiet = process.argv.includes('--quiet');
const errors = [];
const warnings = [];

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const fail = (file, message) => errors.push(`${file}: ${message}`);
const warn = (file, message) => warnings.push(`${file}: ${message}`);

/** Collect relative markdown links that point at repo files. */
function checkLinks(skillDir, body, skillId) {
  const linkRe = /\[[^\]]*\]\(([^)\s]+)\)/g;
  for (const match of body.matchAll(linkRe)) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const clean = target.split('#')[0];
    if (!clean || clean.startsWith('/')) continue;
    const resolved = path.resolve(skillDir, clean);
    if (!fs.existsSync(resolved)) {
      fail(skillId, `broken relative link "${target}"`);
    }
  }
}

function validateSkill(dirName) {
  const skillDir = path.join(SKILLS_DIR, dirName);
  const skillFile = path.join(skillDir, 'SKILL.md');
  const id = `skills/${dirName}`;

  if (!NAME_RE.test(dirName)) {
    fail(id, 'directory name must be kebab-case (^[a-z0-9]+(-[a-z0-9]+)*$)');
  }
  if (dirName.length > 64) fail(id, `directory name is ${dirName.length} chars, max 64`);
  if (RESERVED_NAMES.includes(dirName)) {
    fail(id, `"${dirName}" is a reserved name and will not load`);
  }

  if (!fs.existsSync(skillFile)) {
    fail(id, 'missing SKILL.md');
    return null;
  }

  const stat = fs.statSync(skillFile);
  if (stat.size === 0) {
    fail(id, 'SKILL.md is empty');
    return null;
  }
  if (stat.size > 128 * 1024) {
    fail(id, `SKILL.md is ${(stat.size / 1024).toFixed(0)}KB — move detail into references/`);
  }

  const parsed = readSkill(skillFile, fs);
  if (parsed.error) {
    fail(id, parsed.error);
    return null;
  }
  const data = parsed.data;

  if (!Object.keys(data).length) {
    fail(id, 'frontmatter is empty');
    return null;
  }

  // --- frontmatter keys -------------------------------------------------
  for (const key of Object.keys(data)) {
    if (!ALLOWED_KEYS.includes(key)) {
      fail(id, `frontmatter key "${key}" is not allowed (only ${ALLOWED_KEYS.join(', ')})`);
    }
  }

  // --- name -------------------------------------------------------------
  if (!data.name) {
    fail(id, 'frontmatter is missing "name"');
  } else if (String(data.name) !== dirName) {
    fail(id, `name "${data.name}" must match the directory name "${dirName}"`);
  }

  // --- description ------------------------------------------------------
  const description = fold(data.description);
  if (!description) {
    fail(id, 'frontmatter is missing "description"');
  } else {
    if (description.length > 1024) {
      fail(id, `description is ${description.length} chars, max 1024`);
    }
    if (description.length < 60) {
      warn(id, `description is only ${description.length} chars — likely too thin to trigger`);
    }
    const looksLikeTrigger = /use (this )?(skill )?(when|if|for|before|after)|when the user|when you|when working|use for/i.test(description);
    if (!looksLikeTrigger) {
      warn(id, 'description has no explicit trigger phrase ("Use when …") — the skill may never fire');
    }
    if (/^(a|an|the)\s+(powerful|simple|flexible|comprehensive|seamless|modern)\b/i.test(description)) {
      warn(id, 'description opens with marketing language; lead with the capability');
    }
  }

  // --- license / compatibility -----------------------------------------
  if (!data.license) {
    warn(id, 'no "license" field — consumers cannot tell if reuse is allowed');
  }
  if (data.compatibility && String(data.compatibility).length > 500) {
    warn(id, 'compatibility is long; keep it to one sentence');
  }
  if (data['allowed-tools']) {
    const tools = String(data['allowed-tools']);
    if (/\bBash\b/.test(tools) && !/(scripts?\/|node |python |npm |npx |bash |shell)/i.test(parsed.body)) {
      warn(id, 'grants Bash but the body never explains what it runs');
    }
  }

  // --- metadata ---------------------------------------------------------
  const meta = data.metadata;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    fail(id, 'metadata map is required (version, category, tags)');
  } else {
    if (!meta.version) {
      warn(id, 'metadata.version is missing');
    } else if (!SEMVER_RE.test(String(meta.version))) {
      fail(id, `metadata.version "${meta.version}" is not semver`);
    }
    if (!meta.category) {
      warn(id, 'metadata.category is missing');
    } else if (!CATEGORIES.includes(String(meta.category))) {
      fail(id, `metadata.category "${meta.category}" must be one of ${CATEGORIES.join(', ')}`);
    }
    if (!Array.isArray(meta.tags) || meta.tags.length === 0) {
      warn(id, 'metadata.tags is missing or empty');
    } else if (meta.tags.length > 8) {
      warn(id, `${meta.tags.length} tags — keep it to 2-5 useful ones`);
    }
  }

  // --- body -------------------------------------------------------------
  const body = parsed.body.trim();
  if (!body) {
    fail(id, 'body is empty — frontmatter alone does not tell an agent what to do');
  } else {
    if (!body.startsWith('# ')) {
      warn(id, 'body should start with an H1 heading');
    }
    const lineCount = body.split('\n').length;
    if (lineCount > 400) {
      warn(id, `body is ${lineCount} lines — consider moving detail into references/`);
    }
  }

  checkLinks(skillDir, body, id);

  // --- privacy smoke test (full scan: npm run privacy) ------------------
  const text = parsed.text;
  if (/(?:\/Users\/|\/home\/)[A-Za-z0-9._-]{2,}/.test(text)) {
    fail(id, 'contains an absolute home directory path — remove machine-specific paths');
  }
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(text)) {
    fail(id, 'contains a private key block');
  }

  // --- resources --------------------------------------------------------
  const resources = ['scripts', 'references', 'assets', 'evals'];
  for (const folder of resources) {
    const dir = path.join(skillDir, folder);
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      if (fs.readdirSync(dir).length === 0) warn(id, `${folder}/ exists but is empty`);
    }
  }

  const category = meta && meta.category ? String(meta.category) : 'uncategorised';
  return { id: dirName, description, category, version: meta?.version ?? '0.0.0' };
}

function main() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error('✖ skills/ directory is missing');
    process.exit(1);
  }

  const entries = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();

  if (entries.length === 0) {
    console.error('✖ skills/ contains no skills');
    process.exit(1);
  }

  const skills = entries.map(validateSkill).filter(Boolean);
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry)) fail(entry, 'duplicate skill name');
    seen.add(entry);
  }

  for (const warning of warnings) console.warn(`⚠ ${warning}`);
  for (const error of errors) console.error(`✖ ${error}`);

  if (!quiet) {
    console.log('');
    console.log(`Skills: ${skills.length}`);
    for (const skill of skills) {
      console.log(`  ${skill.id}  v${skill.version}  [${skill.category}]`);
    }
    console.log('');
    console.log(`Result: ${errors.length} error(s), ${warnings.length} warning(s)`);
  }

  process.exit(errors.length ? 1 : 0);
}

main();
