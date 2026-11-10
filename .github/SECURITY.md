# Security Policy

## Supported versions

CrossOver is a single-developer project. Security fixes land in the latest released line on each release channel:

| Channel | Supported |
|---|---|
| Latest stable (`v3.x`) | ✅ Fixes shipped as patch releases. |
| Beta (`v4.0.0-beta.x`) | ✅ Fixes rolled into the next beta. |
| Older majors (`v2.x` and earlier) | ❌ Please upgrade. |

## Reporting a vulnerability

**Please do not open a public GitHub issue.** Use one of the private channels below so users aren't exposed before a fix ships.

1. **Preferred — GitHub Security Advisories.** [Open a private advisory](https://github.com/lacymorrow/crossover/security/advisories/new). This goes straight to the maintainer and lets us collaborate on a fix in private before disclosure.
2. **Email.** [me@lacymorrow.com](mailto:me@lacymorrow.com) with the subject line `CrossOver security`. PGP available on request.

When you report, please include:

- A description of the issue and its potential impact.
- Steps to reproduce, ideally with a minimal proof of concept.
- The CrossOver version (`About` window or `--version`) and your OS.
- Whether you'd like credit in the advisory and, if so, how to attribute you.

## What to expect

- **Acknowledgement** within 72 hours.
- **Initial assessment** within 7 days — we'll let you know if we consider it in scope, what the suspected severity is, and a rough fix timeline.
- **Disclosure timing.** We aim to ship a fix before public disclosure. Default disclosure window is 90 days from the initial report, sooner if a fix is already out.
- **Credit.** Reporters who follow this policy will be credited in the published advisory unless they ask to remain anonymous.

## Scope

In scope:

- The desktop application (Electron main process, renderer, IPC).
- The build and release pipeline as it affects distributed artifacts.
- Auto-update logic and how it talks to GitHub Releases.

Out of scope:

- Vulnerabilities that require physical access to the machine.
- Reports about third-party dependencies without a demonstrated impact on CrossOver itself.
- Anti-cheat or game-launcher behaviour around overlays — that's a policy question for the game vendor, not a CrossOver security bug.

Thanks for helping keep CrossOver users safe.
