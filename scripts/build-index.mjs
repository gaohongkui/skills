#!/usr/bin/env node
/**
 * Generate every derived artifact from the canonical skills/ directory.
 *
 *   node scripts/build-index.mjs           # write
 *   node scripts/build-index.mjs --check   # verify up to date, exit 1 on drift
 *
 * Outputs:
 *   index/skills.json                     machine-readable catalog
 *   index/llms.txt                        agent-friendly catalog (llms.txt convention)
 *   README.md                             table between the SKILLS markers
 *   .claude-plugin/marketplace.json       one plugin per category
 *
 * No timestamps: output must be byte-stable so `--check` can gate CI.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSkill, fold } from './lib/frontmatter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(ROOT, 'skills');

const REPO = 'gaohongkui/skills';
const BRANCH = 'main';
const HOMEPAGE = `https://github.com/${REPO}`;
const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const INSTALL = `npx skills add ${REPO}`;
const MARKETPLACE_NAME = 'gaohongkui-skills';

const CATEGORY_TITLES = {
  docs: 'Docs',
  code: 'Code',
  data: 'Data',
  design: 'Design',
  ops: 'Ops',
  meta: 'Meta',
  uncategorised: 'Uncategorised',
};
const CATEGORY_ORDER = ['docs', 'code', 'data', 'design', 'ops', 'meta', 'uncategorised'];

const CHECK = process.argv.includes('--check');
const GENERATED_BANNER = 'GENERATED FILE — do not edit. Run `npm run build` instead.';

const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function listFiles(dir) {
  const out = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.push(rel(full).slice(rel(dir).length + 1));
    }
  };
  walk(dir);
  return out.sort();
}

function collect() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.error('✖ skills/ directory is missing');
    process.exit(1);
  }
  const entries = fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.') && fs.existsSync(path.join(SKILLS_DIR, entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort();

  return entries.map((name) => {
    const dir = path.join(SKILLS_DIR, name);
    const parsed = readSkill(path.join(dir, 'SKILL.md'), fs);
    const meta = parsed.data.metadata ?? {};
    const description = fold(parsed.data.description);
    return {
      name,
      description,
      summary: firstSentence(description),
      version: String(meta.version ?? '0.0.0'),
      category: String(meta.category ?? 'uncategorised'),
      tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
      license: String(parsed.data.license ?? ''),
      compatibility: parsed.data.compatibility ? fold(parsed.data.compatibility) : undefined,
      path: `skills/${name}`,
      skillFile: `skills/${name}/SKILL.md`,
      rawUrl: `${RAW}/skills/${name}/SKILL.md`,
      files: listFiles(dir),
    };
  });
}

function firstSentence(text) {
  const match = text.match(/^(.+?[.!?])(?:\s|$)/);
  const sentence = (match ? match[1] : text).trim();
  return sentence.length > 160 ? `${sentence.slice(0, 157).trimEnd()}…` : sentence;
}

function buildSkillsJson(skills) {
  const payload = {
    $schema: './skills.schema.json',
    repository: REPO,
    homepage: HOMEPAGE,
    install: INSTALL,
    skillCount: skills.length,
    skills: skills.map((skill) => ({
      name: skill.name,
      description: skill.description,
      version: skill.version,
      category: skill.category,
      tags: skill.tags,
      license: skill.license || undefined,
      compatibility: skill.compatibility,
      path: skill.path,
      skillFile: skill.skillFile,
      raw: skill.rawUrl,
      files: skill.files,
    })),
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function buildLlmsTxt(skills) {
  const lines = [];
  lines.push(`# ${REPO}`);
  lines.push('');
  lines.push(
    '> Public agent skills published under the Agent Skills open standard. Each entry links to a',
  );
  lines.push(
    '> self-contained SKILL.md — read it directly, no clone required. Use `npx skills add ' +
      `${REPO}\` to install all of them.`,
  );
  lines.push('');
  lines.push(`Machine-readable index: ${RAW}/index/skills.json`);
  lines.push(`Repository: ${HOMEPAGE}`);
  lines.push('');

  const byCategory = new Map();
  for (const skill of skills) {
    if (!byCategory.has(skill.category)) byCategory.set(skill.category, []);
    byCategory.get(skill.category).push(skill);
  }

  for (const category of CATEGORY_ORDER) {
    const group = byCategory.get(category);
    if (!group || group.length === 0) continue;
    lines.push(`## ${CATEGORY_TITLES[category] ?? category}`);
    lines.push('');
    for (const skill of group) {
      lines.push(`- [${skill.name}](${skill.rawUrl}): ${skill.description}`);
    }
    lines.push('');
  }
  return `${lines.join('\n').trimEnd()}\n`;
}

function buildReadmeTable(skills) {
  const lines = [];
  lines.push('| Skill | What it does | Category | Version |');
  lines.push('| --- | --- | --- | --- |');
  for (const skill of skills) {
    const cell = skill.summary.replace(/\|/g, '\\|');
    lines.push(`| [\`${skill.name}\`](skills/${skill.name}/SKILL.md) | ${cell} | \`${skill.category}\` | ${skill.version} |`);
  }

  const plugins = pluginNames(skills);
  if (plugins.length) {
    lines.push('');
    lines.push('Claude Code users can install the same skills as a managed plugin:');
    lines.push('');
    lines.push('```bash');
    lines.push(`/plugin marketplace add ${REPO}`);
    for (const plugin of plugins) lines.push(`/plugin install ${plugin}@${MARKETPLACE_NAME}`);
    lines.push('```');
  }
  return lines.join('\n');
}

/** One plugin per category, listed in the marketplace manifest. */
function pluginNames(skills) {
  return [...new Set(skills.map((skill) => `${skill.category}-skills`))].sort();
}

function buildMarketplace(skills) {
  const byCategory = new Map();
  for (const skill of skills) {
    if (!byCategory.has(skill.category)) byCategory.set(skill.category, []);
    byCategory.get(skill.category).push(skill.name);
  }

  const plugins = [];
  for (const category of CATEGORY_ORDER) {
    const names = byCategory.get(category);
    if (!names || names.length === 0) continue;
    plugins.push({
      name: `${category}-skills`,
      source: './',
      description: `${CATEGORY_TITLES[category] ?? category} skills for AI agents.`,
      strict: false,
      skills: names.map((name) => `./skills/${name}`),
    });
  }

  const payload = {
    name: MARKETPLACE_NAME,
    owner: { name: 'gaohongkui', url: 'https://github.com/gaohongkui' },
    metadata: {
      description: 'Public agent skills: docs, code, data, design, ops and meta workflows.',
      version: '0.1.0',
    },
    plugins,
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

function buildReadme(skills) {
  const readmePath = path.join(ROOT, 'README.md');
  const current = fs.readFileSync(readmePath, 'utf8');
  const start = '<!-- BEGIN:SKILLS (generated by scripts/build-index.mjs — do not edit) -->';
  const end = '<!-- END:SKILLS -->';
  const startIdx = current.indexOf(start);
  const endIdx = current.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    console.error('✖ README.md is missing the SKILLS marker block');
    process.exit(1);
  }
  const next =
    current.slice(0, startIdx + start.length) + '\n' + buildReadmeTable(skills) + '\n' + current.slice(endIdx);
  return next;
}

function writeOrCheck(relativePath, content) {
  const target = path.join(ROOT, relativePath);
  const exists = fs.existsSync(target);
  const previous = exists ? fs.readFileSync(target, 'utf8') : null;

  if (CHECK) {
    if (previous !== content) {
      console.error(`✖ ${relativePath} is out of date — run \`npm run build\``);
      return false;
    }
    return true;
  }

  if (previous === content) {
    console.log(`· ${relativePath} unchanged`);
    return true;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
  console.log(`✔ ${relativePath}`);
  return true;
}

function main() {
  const skills = collect();
  const results = [
    writeOrCheck('index/skills.json', buildSkillsJson(skills)),
    writeOrCheck('index/llms.txt', buildLlmsTxt(skills)),
    writeOrCheck('.claude-plugin/marketplace.json', buildMarketplace(skills)),
    writeOrCheck('README.md', buildReadme(skills)),
  ];
  if (CHECK && results.includes(false)) {
    console.error('\nGenerated files are stale. Run `npm run build` and commit the result.');
    process.exit(1);
  }
  if (!CHECK) console.log(`\n${skills.length} skill(s) indexed.`);
}

main();
