# Pull request

## What this changes

<!-- One line: which skill, and what behaviour changes. -->

## Checklist

- [ ] `npm run ci` passes locally (validate + generated files + privacy)
- [ ] `description` says what the skill does **and** when to use it
- [ ] Only the six allowed frontmatter keys
- [ ] `SKILL.md` under ~300 lines; detail moved to `references/`
- [ ] Scripts run on a stock runtime and make no network calls
- [ ] Generated files rebuilt and committed

## 🚨 Privacy check — read every line, do not trust the scanner

- [ ] No personal data (real names beyond copyright, addresses, private email/phone/ID,
      colleague or customer names, chat screenshots)
- [ ] No secrets (keys, tokens, passwords, private keys, `.env`, cookies, signed URLs,
      connection strings)
- [ ] No internal-only material (internal hosts, wiki URLs, codenames, unreleased plans,
      non-public metrics)
- [ ] No machine fingerprints (absolute home paths, private IPs, hostnames, device IDs)
- [ ] Third-party content is licensed for redistribution

I read `git diff` for this branch, not just the scanner output.

See [`docs/publishing-checklist.md`](../docs/publishing-checklist.md).
