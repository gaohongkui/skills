# Delivery report template

Load this at step 4. Keep the whole report under ~40 lines — the user must be able to stop
after the diagnosis and still know what you did.

```markdown
## Diagnosis
- Task map: <state> — gap: <file:line>
- Tooling: <state> — gap: <file:line>
- Verification: <state> — gap: <file:line>
- Feedback: <state> — gap: <file:line>
- Verdict: <weakest link> → <smallest change that closes it>

## Agreed standard
- Must have: <from the conversation>
- Must not happen: <from the conversation>
- Human-only steps: <from the conversation>

## Changed
- <file>: <what> — because <diagnosis line>
- <file>: <what> — because <diagnosis line>

## Verification
| Check | State | Evidence |
| --- | --- | --- |
| <what> | Automatically verified | `<command>` → <result> |
| <what> | AI-assessed | read <artifact>; <judgment> |
| <what> | Human-confirmed | user: "<their words>" |
| <what> | Not yet verified | needs <what> |

## Still needs a human
- <judgment call you deliberately did not automate>

## Next loop
- On the next correction: <where it gets recorded> → <what it becomes>
```

## Rules for filling it in

- Every row in **Verification** needs evidence in the third column. An empty evidence cell
  means the state is `Not yet verified`, whatever the label says.
- **AI-assessed** is not a weaker word for verified. Say what you looked at, so the user can
  disagree with your reading.
- **Human-confirmed** requires quoting the user. Your own summary of their approval does not
  count.
- A regression is a line in **Changed**, not something to leave out. "Nothing regressed" is
  a claim you must be able to point at a command for.
- If nothing needed changing, say that — a clean diagnosis is a valid delivery, and it is
  cheaper than a refactor that closes no gap.
