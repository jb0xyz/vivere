# Contributing to Vivere

Thanks for taking the time to contribute. This project is in early development, and
issues, ideas, and pull requests are all welcome.

## Development setup

Vivere is a pnpm monorepo. You will need Node.js 20.11+ and pnpm 9.

```bash
git clone https://github.com/jb0xyz/vivere.git
cd vivere
pnpm install
```

Common commands, run from the repository root:

```bash
pnpm build       # build every package
pnpm test        # run the test suite
pnpm typecheck   # type-check every package
pnpm lint        # lint the codebase
pnpm format      # format with Prettier
```

## Making changes

- Keep each change focused. Small, self-contained pull requests are easier to review.
- Add or update tests for anything you change; the suite runs with Vitest.
- Run `pnpm test`, `pnpm typecheck`, and `pnpm lint` before opening a pull request.
- Match the surrounding code style. Formatting is handled by Prettier.

## Commit messages

We loosely follow [Conventional Commits](https://www.conventionalcommits.org):

```
feat: add cooldown support to commands
fix: handle empty option values
docs: clarify the getting started guide
```

## Pull requests

Open a pull request against the `main` branch and describe what your change does and
why. If it addresses an open issue, please link it. A maintainer will review it as
soon as they can.

## Questions

If something is unclear or you are not sure where to start, open an issue — questions
are welcome too.
