# Security policy

## What this repository publishes

Everything under `skills/` is public and is redistributed by the skills CLI, mirrored by
`skills.sh`, and pasted into other agents' contexts. Treat every committed line as
permanent and world-readable.

If you find personal data, a credential, or internal-only material in this repository,
report it privately rather than opening a public issue with the contents.

## Reporting

- **Sensitive content already committed:** open a private security advisory on this
  repository (`Security → Advisories → New draft advisory`) with the path and line.
  Do not quote the secret in a public issue.
- **Vulnerability in a skill's script:** same channel — a private security advisory.

There is no bug bounty. Expect an acknowledgement within a few days.

## Maintenance commitments

- Secrets are rotated before history is rewritten; a pushed secret is treated as
  compromised even after `git filter-repo`.
- The privacy gate (`npm run privacy`) runs in CI on every push and pull request.
  It is a safety net, not a guarantee — it cannot recognize context-dependent leaks such
  as a colleague's name or an unreleased codename.

Full procedure: [`docs/publishing-checklist.md`](./docs/publishing-checklist.md).
