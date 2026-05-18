# Contributing to CrossOver

Thanks for wanting to help. CrossOver is built and maintained by one person, so every reasonable contribution is welcome.

## Filing a bug

Use the [Bug Report issue template](https://github.com/lacymorrow/crossover/issues/new?template=bug-report.md). Please include:

- Your OS and version (e.g. Windows 11 23H2, macOS 14.4 arm64, Ubuntu 24.04).
- CrossOver version (`About` window, or `--version` from the command line).
- Steps to reproduce.
- The game (if any) and its display mode (`Windowed`, `Borderless`, `Fullscreen`).
- Console output if you can capture it — run CrossOver with `--debug` to see logs.

## Requesting a feature

Use the [Feature Request issue template](https://github.com/lacymorrow/crossover/issues/new?template=feature_request.md), or open a [Discussion](https://github.com/lacymorrow/crossover/discussions) first if you want to sanity-check the idea before opening an issue.

## Sending a pull request

1. Fork the repo and create a branch from `main`.
2. Run the app locally — see [`docs/DEVELOPMENT.md`](../docs/DEVELOPMENT.md) for the build + debug + release guide.
3. Keep the change focused. One concern per PR is easier to review.
4. Match the existing code style: ESLint with the XO config, tabs, no semicolons.
5. Run `npm run lint` and `npm test` (Playwright) before opening the PR.
6. Use conventional commit prefixes — `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, `ci:`.
7. Mention the related issue with `Fixes #NN` so it auto-closes on merge.

## Reviewing your own diff

Before requesting review, please look at your own diff and check that:

- No accidental commits of `.DS_Store`, `node_modules/`, build artifacts, or local config.
- No leftover debug logging.
- New strings are user-friendly (or marked as internal).
- The change doesn't grow the bundle for no reason — CrossOver is intentionally small.

## Working on crosshair art

Want to add a new crosshair to the shipped library? Drop the file in `src/static/crosshairs/<Category>/<Name>.png` (or `.svg`). Keep contributions credited — add a one-line attribution to the README's [Credits](../readme.md#credits) section.

By the time you open a PR with new art, please confirm you have the right to redistribute the file under the project's license.

## Security

Please don't open public issues for security problems — see [`SECURITY.md`](./SECURITY.md) for the responsible-disclosure path.

## License

By submitting a PR you agree your contribution is licensed under [FSL-1.1-MIT](../LICENSE), the same license as the rest of the project.
