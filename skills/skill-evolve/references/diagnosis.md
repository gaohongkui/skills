# Diagnosis — the four dimensions

Load this when you are writing the step-1 diagnosis. Four dimensions, one concrete gap
each. A gap is concrete if it names a file, a step, or a missing command — "the skill is
unclear" is not a gap.

For every dimension below: **read the evidence before you ask.** Docs, `git log`,
`references/`, past corrections in the conversation, existing samples. Questions come last.

## 1. Task map

Goal: can a competent stranger follow this to a defined finish line?

Look for:

- **Finish line** — is "done" observable, or is it a feeling? ("Validate every link" is
  observable; "make it polished" is not.)
- **Ordering** — are steps numbered, or scattered through prose? Are there steps that
  silently depend on an earlier one?
- **Branch conditions** — every "if the user wants X, do Y" needs the condition in the
  *trigger*, not buried in step 6.
- **Inputs and outputs** — what does the skill receive, and what exact artifact does it
  produce? A skill with no stated output can never be verified.
- **Dependencies** — files, CLIs, network, credentials. Are they named, or assumed?

Common gaps: an unobservable finish line; a branch that only the author knows about; an
output described by vibe ("a good summary").

## 2. Tooling

Goal: which steps are repeated, deterministic, and easy to get wrong?

Build a small table while reading:

| Step | Repeated? | Deterministic? | Error-prone? | Already scripted? |
| --- | --- | --- | --- | --- |

Script a step only when the first three columns are all yes. Three noes in a row is a
signal, not a task.

Look for:

- The same shell incantation written in prose in two places.
- A step whose failure is silent (encoding, path separators, quoting).
- Checks the model performs by eye that a 20-line script would do exactly.

Do **not** script: one-off migrations, anything needing judgment, anything whose script
would be longer than the prose it replaces. The guide is explicit — a CLI is not
mandatory, and a forced CLI is a new failure surface.

## 3. Verification

Goal: how do we know it worked, *today*?

Split every requirement into checkable and not:

- **Checkable** — file exists, link resolves, frontmatter has key K, command exits 0,
  table has N rows, output matches a schema, no forbidden string present.
- **Not checkable** — tone, aesthetic fit, whether the example is persuasive, whether the
  recommendation is wise.

Then answer: which lines in the current skill are checkable requirements written as
prose-only promises? Each is a place where the skill is trusting the model. Convert them,
or mark them explicitly as human review.

Watch for the anti-pattern: a skill that says "make sure the links work" and never runs a
link check. That sentence is a wish, not a gate.

## 4. Feedback

Goal: when the user corrects it, what actually changes?

Look for:

- Corrections that repeat across sessions — the same miss twice means the fix was prose.
- Whether any corrected case was kept as a sample. A correction that only lives in chat
  history is lost.
- A place to record: `evals/`, a `samples/` folder, or the skill's own `references/`.

Classify each correction before acting:

| Correction | Cheapest durable fix |
| --- | --- |
| "This output shape is wrong" | a regression sample |
| "It keeps forgetting step 3" | a check, or reorder the task map |
| "The tone is off" | a worked example in `references/` |
| "This time I wanted it shorter" | nothing permanent — a one-off preference |

That last row matters most. Promoting a one-off preference into a standing rule is how
skills become unreadable.

## Writing the diagnosis

Five lines, one per dimension plus a verdict:

```text
Task map:   <state> — gap: <file:line or step>
Tooling:    <state> — gap: ...
Verification:<state> — gap: ...
Feedback:   <state> — gap: ...
Verdict:    <one of: structure / tooling / verification / feedback> is the weakest link;
            propose <smallest change that closes it>.
```

The verdict matters: it forces you to pick one thing to fix first instead of refactoring
all four and calling it improvement.
