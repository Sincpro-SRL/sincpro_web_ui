# @sincpro/web-ui

The Sincpro design system for React: tokens, primitives and behaviour rules.

```bash
yarn add @sincpro/web-ui react react-dom
```

Requires React 19 or newer.

## Development

```bash
make init     # pre-commit + yarn install
make test
make build
```

Node 22 or newer. Every operation — local or CI — goes through the `Makefile`; run `make` to
list the targets.

```text
src/      the published source (imports itself as @sincpro/web-ui)
tests/    node --test over the TypeScript sources
```

## CI/CD

The workflows in `.github/workflows/` only delegate to the shared `Sincpro-SRL/.github`
pipeline, which calls `make init`, `make verify-format`, `make test`,
`make update-version VERSION=x` and `make publish`.
