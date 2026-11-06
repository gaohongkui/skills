# Taxonomy — naming, categories, descriptions

Rules are enforced by `scripts/validate.mjs` where possible, and by review where not.

## Skill names

| Rule | Enforced |
| --- | --- |
| kebab-case: `^[a-z0-9]+(-[a-z0-9]+)*$` | ✅ |
| ≤ 64 characters | ✅ |
| Globally unique (no duplicate directory names) | ✅ |
| Matches the directory name exactly | ✅ |
| Verb-first or noun-that-names-the-job: `changelog-writer`, not `writer-of-changelogs` | review |
| No vendor prefixes (`claude-`, `cursor-`, `my-`), no versions (`-v2`) | review |
| Not a reserved name: `synced`, `anthropic-skills` | ✅ |

Name the *task*, not the *tool*. `pdf-extract` beats `pdftotext-runner`; the tool can change.

## Categories

Every skill sets `metadata.category` to exactly one of:

| Category | Use for |
| --- | --- |
| `docs` | writing, editing, reviewing, converting documents |
| `code` | refactoring, review, testing, debugging, repo hygiene |
| `data` | extraction, transformation, analysis, visualization |
| `design` | UI, diagrams, visual assets, layout |
| `ops` | deployment, CI, infrastructure, incident work |
| `meta` | things that operate on agents, skills, or context itself |

A skill that needs two categories is usually two skills.

## `description` — the trigger surface

This single field decides whether an agent ever loads the skill. It is not a summary;
it is a *matching surface* plus a *boundary condition*.

Rules:

- ≤ 1024 characters, one paragraph, no markdown, no line breaks that break YAML.
- Opens with the capability in plain verbs: "Extract tables and text from PDFs."
- Then the **trigger**: "Use when the user shares a PDF, pastes a PDF path, or asks to
  pull data out of one."
- Then, when ambiguous, the **exclusion**: "Not for generating PDFs or editing layouts."
- Mention the concrete nouns a user would say — file extensions, product names, commands.
  Agents match on words, not intent.
- No marketing adjectives ("powerful", "seamless", "blazing fast"). They consume the
  budget and match nothing.
- Write it in English even when the skill handles Chinese content; the matcher and the
  directory are English-first. Put locale details in the body.

Good:

```yaml
description: >-
  Turn a session transcript into a HANDOFF.md so a new session can resume without
  re-reading history. Use when the user asks to hand off, wrap up, summarize context
  for a new chat, or says "write a handoff".
```

Bad:

```yaml
description: A powerful and flexible handoff utility for modern AI workflows.
```

## Body shape

1. One sentence on what the skill produces.
2. **When to use / when not to** (short bullets).
3. Workflow — numbered, imperative, with the decision points spelled out.
4. Hard rules — the things an agent gets wrong by default.
5. Output contract — exact shape of what the user should see.

Keep `SKILL.md` under ~300 lines. Anything longer belongs in `references/`, loaded on
demand. Long reference files are the correct place for checklists, schemas, and examples.

## `metadata`

Free-form map. Conventional keys used here:

| Key | Type | Meaning |
| --- | --- | --- |
| `version` | semver string | Bumped on every behavioural change |
| `category` | string | One of the categories above |
| `tags` | string[] | 2–5 lowercase search terms |
| `summary-zh` | string | Optional one-line Chinese summary, used in the `README.zh-CN.md` table. Omit it and the English first sentence is used. |

Client-specific extensions go here too, namespaced: `metadata.cc-argument-hint`.

## Versioning

Semver on the *behaviour* of the skill, not on the repo:

- `patch` — wording, typo, clearer rule, no change in outcome
- `minor` — new capability, new option, backwards compatible
- `major` — trigger conditions narrowed/widened, output shape changed, behaviour removed

Anchor your first release at `0.1.0`; go to `1.0.0` once you have used it on real work.
