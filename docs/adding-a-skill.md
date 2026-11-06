# Adding a skill

The whole loop is five commands. Details below.

```bash
mkdir -p skills/my-skill
$EDITOR skills/my-skill/SKILL.md
npm run build
npm run ci
git add -A && git commit -m "feat(my-skill): add my-skill"
```

## 1. Scaffold the directory

```bash
mkdir -p skills/my-skill/{scripts,references}
```

Only create the subdirectories you actually use. An empty `references/` is noise.

```
skills/my-skill/
├── SKILL.md            # required — the only required file
├── scripts/            # optional — executable helpers the skill calls
├── references/         # optional — long docs, loaded only when needed
├── assets/             # optional — templates, fixtures
└── evals/              # optional — trigger cases + expected behaviour
```

## 2. Write the frontmatter

Copy this and edit. Exactly six keys are allowed — see [`taxonomy.md`](./taxonomy.md).

```yaml
---
name: my-skill
description: >-
  Do the concrete thing. Use when the user does X, Y, or says "z".
license: MIT
compatibility: Requires Node.js 18+ on PATH
metadata:
  version: 0.1.0
  category: meta
  tags: [context, handoff]
allowed-tools: Bash Read Write
---
```

Drop `allowed-tools` and `compatibility` if they do not apply. Only grant `Bash` when
the skill genuinely needs it.

## 3. Write the body

Follow the body shape in [`taxonomy.md`](./taxonomy.md#body-shape). The test for a good
skill: a competent agent that has never seen your project can follow it once and get the
right result, and a user can tell from `description` alone whether it applies.

## 4. Regenerate and verify

```bash
npm run build     # rewrites index/, both README tables, marketplace.json
npm run ci        # validate + check + privacy
```

`npm run link` symlinks every skill into `~/.agents/skills`, which DSH, Claude Code,
Codex, Cursor and others read — the fastest way to test real triggering. Add
`--target <dir>` for a different client, `--copy` if symlinks are a problem, and
`--unlink` to remove what this repo linked.

## 5. Run the privacy gate

Do not skip this. Read [`publishing-checklist.md`](./publishing-checklist.md) and run:

```bash
npm run privacy
git diff --cached
```

## 6. Commit

Conventional commits, scoped by skill name:

```
feat(handoff-writer): add handoff-writer
fix(handoff-writer): stop truncating decisions section
docs(taxonomy): clarify description rules
chore(index): rebuild catalog
```

One skill per commit where possible — it keeps `git log -- skills/<name>` readable and
makes reverts surgical.

## Checklist before opening a PR

- [ ] `npm run ci` passes locally
- [ ] `description` says what the skill does **and** when to use it
- [ ] No client-specific frontmatter keys (six keys only)
- [ ] `SKILL.md` under ~300 lines; long material moved to `references/`
- [ ] Scripts run on a stock runtime and make no network calls
- [ ] `metadata.version`, `category`, `tags` set
- [ ] **Privacy gate reviewed** — no secrets, no personal data, no internal-only material
- [ ] Generated files committed (`index/`, both README tables, `marketplace.json`)
