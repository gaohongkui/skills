---
name: skill-evolve
description: >-
  Turn a prompt-only skill into a work system: a task map, real checks instead of prose
  promises, and a feedback loop that survives the next correction. Use when the user asks
  to improve, harden, refactor, or "self-iterate" an existing SKILL.md, says a skill is
  unreliable or keeps missing steps, or wants tooling, verification, or regression
  samples added to a skill.
license: MIT
compatibility: Works on plain files. Needs no runtime; checks run with whatever the skill under repair already requires.
metadata:
  version: 0.1.0
  category: meta
  tags: [skill, refactor, verification, tooling, feedback-loop]
  summary-zh: 把只会「说」的 skill 改造成有工作地图、有检查、能持续改进的工作系统。
allowed-tools: Read Write Edit Grep Glob Bash
---

# Skill Evolve

Rewrite an existing skill so that its correctness stops depending on the model's goodwill.
The target, in the words of the original guide: **structure clear, tools reliable, results
verifiable, improvable from feedback.**

The failure this fixes: a skill that reads well, works most of the time, and has no way to
tell whether it worked this time.

## When to use

- The user says a skill is unstable, misses steps, or gives inconsistent output.
- The user asks to "改造 / 升级 / 自迭代 / harden / refactor" a `SKILL.md`.
- A skill's requirements are all prose and none of them are checked.
- You just got corrected on the same skill twice.

Not for: writing a skill from scratch, or rewording a skill whose behaviour is fine.

## Workflow

### 1. Read first, diagnose — do not rewrite yet

Read the `SKILL.md`, then every file it points at (`references/`, `scripts/`, `assets/`).
Produce a short diagnosis across four dimensions. One paragraph each, each ending in **one
concrete gap**, not a list of complaints:

| Dimension | Ask |
| --- | --- |
| **Task map** | Can someone follow this to a defined finish line? Where does it branch, and is the branch condition written down? |
| **Tooling** | Which steps are repeated, deterministic, and easy to get wrong? Are any already scripted? |
| **Verification** | How do we know it worked — today? Which requirements are prose-only? |
| **Feedback** | When the user corrects it, what changes? Does the same error come back? |

Detail, probing questions, and common gaps: [`references/diagnosis.md`](references/diagnosis.md).

Do not open with a rewrite. A diagnosis that surprises the user is worth more than a
refactor they did not ask for — and the guide is explicit: no large-scale restructuring
before you have read and reported.

### 2. Confirm the acceptance standard — at most 3 questions

Ask only what the files cannot answer. Before asking, answer it yourself from the docs,
git history, and past corrections; if you have a guess, offer it for correction instead of
asking open-ended:

> "我理解「好结果」是 X（依据是 A 和 B），对吗？"

The three questions worth spending a round on:

1. What does a *good* result look like — which parts are must-have, which are taste?
2. What is the error you least want to see? What has repeatedly gone wrong before?
3. Which steps must a human confirm, and which can run unattended?

Rules: never ask the user to re-explain what is already written down; never exceed three
questions per round; carry the answers into the diagnosis rather than starting over.

### 3. Change only what the diagnosis justified

Four moves, in this order of preference — earlier ones are cheaper and age better:

1. **Structure** — write the task map: goal, ordered steps, inputs/outputs, dependencies,
   branch conditions, acceptance. Rewrite the prose only where the map exposed a hole.
2. **Tooling** — script the steps that are repeated *and* deterministic. One entry point
   (`scripts/foo.mjs` with a `--help`), one exit code convention. One-off steps get no
   tool; the original guide is explicit that a CLI is not mandatory.
3. **Verification** — convert every checkable requirement into a command. Record what was
   checked, the command, and the result. Re-run affected checks after any content change.
   Subjective judgment (tone, aesthetics, fit) stays human — say so instead of faking a
   check.
4. **Feedback** — keep a short log of corrections. Promote each error to the cheapest
   artifact that prevents it: a regression sample first, a check second, a tool third, and
   prose rules last. Separate one-off preferences from standing rules, or the skill grows a
   rule per incident forever.

### 4. Test, compare, deliver

- Run the skill's existing samples end to end. If there are none, create one minimal
  sample before changing behaviour, so "before" is measurable.
- Compare old and new output on that sample; name any regression instead of hiding it.
- **Do not overwrite the original or a real deliverable without confirmation.** Work on a
  copy, or show the diff and wait.
- Report with the four states kept apart. Collapsing them is how "looks right" becomes
  "verified".

| State | Means | Evidence required |
| --- | --- | --- |
| **Automatically verified** | A command ran and passed | command + output |
| **AI-assessed** | You read the result and judged it | what you looked at and why |
| **Human-confirmed** | The user said yes | their words |
| **Not yet verified** | No evidence | do not upgrade this label |

Deliver a short report — template in
[`references/report-template.md`](references/report-template.md):

1. What changed and why (linked to the diagnosis).
2. What can now be checked automatically, and by which command.
3. What still needs a human decision.
4. How the next correction enters the loop.

## Hard rules

- **Never claim verification you did not run.** No command output, no "verified".
- **Never inflate the rule list to cover an incident.** If a rule is the only fix, the
  diagnosis was wrong — prefer a sample or a check.
- **Do not refactor what already works.** Keep working design even if it is inelegant;
  style is not the goal.
- **Do not touch a skill the user did not point at.** Ask first if the evidence suggests a
  sibling skill has the same bug.
- **Preserve the trigger.** `description` is what makes the skill fire; rewriting it is a
  behaviour change and needs its own confirmation.
- **Stop when the gap is closed.** A skill that grew 40% is a warning, not a trophy.

## Output contract

A diagnosis, the confirmed standard, the changes, a four-state verification table, and the
next-loop trigger — in that order, under ~40 lines. The user should be able to stop reading
after the diagnosis and still know what you are about to do.

## Credit

The four dimensions, the four states, and the "tools and samples before prose" principle
come from the **Skill 自迭代能力改造指南**, shared publicly by **晓辉博士 / 新可能实验室
(NEW POSSIBILITIES)**. This file is an independent re-expression for direct agent
execution — not an official release, and not endorsed by the author.
