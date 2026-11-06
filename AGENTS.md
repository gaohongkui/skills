# AGENTS.md

Canonical instructions for any agent (Claude Code, Codex, Copilot, Cursor, DSH, …)
working **in this repository**. `CLAUDE.md` points here; nothing else overrides this file.

> This file is about *maintaining the repo*. Skills that users install live in
> `skills/<name>/SKILL.md` and each of them carries its own instructions.

## What this repo is

A public collection of agent skills, published under the
[Agent Skills](https://agentskills.io/specification) open standard and installable with
`npx skills add gaohongkui/skills`.

## Invariants (do not break)

1. **One canonical source.** A skill exists exactly once, at `skills/<name>/SKILL.md`
   plus its resources. Every other listing — `index/`, the README tables,
   `.claude-plugin/marketplace.json` — is **generated** by `scripts/build-index.mjs`.
   Never hand-edit a generated file; edit the skill and re-run the build.
2. **Only six frontmatter keys.** `name`, `description`, `license`, `compatibility`,
   `metadata`, `allowed-tools`. Client-specific keys (`argument-hint`,
   `disable-model-invocation`, `context: fork`, …) make strict validators fail with
   `Unexpected key`. Put client extensions under `metadata`.
3. **`description` states *what* and *when*.** It is the trigger surface an agent
   matches against. A feature blurb means the skill never fires.
4. **Flat and shallow.** Skills live at `skills/<name>/`. No nesting, no per-client
   copies of the same skill.
5. **Public by default.** Anything committed here is world-readable forever.
   See the gate below.
6. **Two READMEs, one generator.** `README.md` is English (the default GitHub renders) and
   `README.zh-CN.md` is Chinese. Each opens with a `English | 中文` switch. The skills
   table is generated into both from the same data; prose changes must land in both, or
   the two pages start telling different stories.

## Layout

| Path | Role | Edited by |
| --- | --- | --- |
| `skills/<name>/SKILL.md` | Canonical skill source | humans |
| `skills/<name>/{scripts,references,assets,evals}/` | Optional resources (progressive disclosure) | humans |
| `index/skills.json` | Machine-readable catalog | `npm run build` |
| `index/llms.txt` | Agent-friendly catalog | `npm run build` |
| `README.md` table | Human catalog — English (default) | `npm run build` |
| `README.zh-CN.md` table | Human catalog — Chinese | `npm run build` |
| `.claude-plugin/marketplace.json` | Claude Code plugin marketplace | `npm run build` |
| `docs/taxonomy.md` | Naming + category rules | humans |
| `docs/adding-a-skill.md` | Contribution flow | humans |
| `docs/publishing-checklist.md` | **Privacy / sensitive-data gate** | humans |

## Commands

```bash
npm run validate    # frontmatter, naming, links, size limits
npm run build       # regenerate index/, both README tables, marketplace.json
npm run check       # verify generated files are up to date (CI mode)
npm run privacy     # scan for secrets, PII, internal-only references
npm run ci          # validate + check + privacy (same as CI)
npm run link        # symlink skills/ into ~/.agents/skills for local testing
```

Requires Node.js ≥ 18. No dependencies, by design — nothing to audit or break.

## Adding a skill

```bash
mkdir -p skills/my-skill
$EDITOR skills/my-skill/SKILL.md   # frontmatter per docs/taxonomy.md
npm run build && npm run ci
```

Then follow `docs/adding-a-skill.md`.

## 🚨 Before every push or publish

**This repository is public. A commit is not a draft: once pushed it is indexed,
mirrored, and cached, and deleting it later does not un-publish it.**

Never commit, and always check for:

- **Personal data** — real names beyond the copyright line, home addresses, personal
  email addresses, phone numbers, ID numbers, private account IDs, customer or
  colleague names, chat screenshots, calendar or ticket dumps.
- **Secrets** — API keys, tokens, passwords, cookies, private keys, `.env` files,
  signed URLs, connection strings, OAuth client secrets.
- **Internal-only material** — employer-internal hostnames, domains, project code
  names, internal URLs/wiki links, unreleased roadmap, non-public metrics, Slack
  thread exports, internal repo paths.
- **Machine fingerprints** — absolute home paths (`/Users/<you>/…`), internal IPs,
  hostnames, usernames, device IDs, full shell history.
- **Third-party data without a license** — copied code, docs, datasets, or screenshots
  you do not have the right to redistribute.

The gate:

```bash
npm run privacy     # must exit 0 (or every hit triaged into .privacyignore)
npm run ci          # validate + generated files in sync + privacy
```

`npm run privacy` is a safety net, **not** a substitute for reading your own diff:

```bash
git diff --cached     # read every added line before committing
git status            # no stray .env, screenshots, or local notes
```

If something sensitive already landed: **rotate the credential first**, then remove it
from history (`git filter-repo`) before pushing. If it is already public, treat the
secret as compromised — rewriting history does not un-leak it.
Full procedure: [`docs/publishing-checklist.md`](docs/publishing-checklist.md).

## Style for skills

- Imperative, second person, no marketing voice.
- Keep `SKILL.md` under ~300 lines; push detail into `references/` and load it only
  when needed (progressive disclosure).
- Every rule should be actionable. "Be careful" is not a rule.
- Scripts must run with a stock runtime (Node/Python), declare their requirements in
  `compatibility`, and never phone home.

## Generated files

Files with `DO NOT EDIT` / `GENERATED` at the top are produced by
`scripts/build-index.mjs`. CI (`npm run check`) fails when they drift.
