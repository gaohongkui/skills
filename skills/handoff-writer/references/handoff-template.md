# HANDOFF — <one-line title>

<!--
Annotated template for handoff-writer. Delete every comment before shipping.
Order matters: goal → state → next action → everything else.
Budget: ~150 lines. If it is longer, you are transcribing the session instead of
transferring state.
-->

## Goal

<!-- One sentence. Then the finish line, concretely observable. -->

<What this work must achieve.> Done = <observable condition, e.g. "npm test green and
the manual replay shows 1s/2s/4s/8s/16s gaps">.

## State

<!-- What works, what does not, and the last thing you actually verified. -->
<!-- Write "verified <command>: <result>" — not "should work". -->

- Works: <subsystem> — verified `<command>` → <result>
- Broken: <what and where, with file:line>
- Not started: <what>

## Next action

<!-- ≤5 numbered steps. Step 1 must be startable with no further decisions. -->
<!-- Each step: command or file:line, plus what success looks like. -->

1. `<command>` — expected: <result>
2. <edit this> at `<file:line>`
3. `<command>` — expected: <result>

## Decisions

<!-- Chosen option, rejected alternatives, the reason, and the date. -->
<!-- The reason is the part a fresh agent cannot recover from the code. -->

- <date> — <decision>. Rejected <alternative> because <reason>.

## Traps

<!-- Things that cost time and would cost it again: surprising behaviour, misleading
     docs, order-dependent setup, flaky tests. -->

- <trap> — <what actually happens> — <what to do instead>

## Map

<!-- Only paths that matter, one line each, with why. Not a file listing. -->

- `<path>` — <why it matters>
- `<path>` — <why it matters>

## Open questions

<!-- Unresolved items and who/what can resolve them. Mark assumptions explicitly. -->

- <question> — blocked on <person / experiment / upstream issue>
- Assumed <X>; unverified. Verify by <how>.

## Environment

<!-- Optional. Version facts and setup steps that are not in the README. -->
<!-- Credentials by NAME and location only — never by value. -->

- Runtime: <versions that matter>
- Setup: `<command>`
- Credentials: <name> in <location>
