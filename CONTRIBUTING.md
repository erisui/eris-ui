# Contributing

Thanks for helping with Eris UI. This guide covers how the repo is laid out, how to run it, and how to add a component.

## Repo layout

| Path                      | What it is                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `packages/components`     | Source of truth for every free component, plus `eris-core` (mount lifecycle, helpers, theme) |
| `apps/playground`         | Bare Astro app for trying components; Playwright and axe tests run against it                |
| `apps/www`                | erisui.dev: landing page, docs with live demos, and the hosted registry at `/r`              |
| `packages/registry-build` | Turns component source into shadcn-compatible registry JSON                                  |
| `packages/cli`            | The `eris-ui` CLI: `init`, `add`, `diff`                                                     |
| `tooling/tsconfig`        | Shared TypeScript config                                                                     |

## Develop

Requires Node 22.12+ and pnpm 10.

```sh
pnpm install
pnpm dev                       # playground at http://localhost:4321
pnpm --filter www dev          # the website
pnpm build
pnpm check                     # astro check + tsc
pnpm test                      # CLI unit tests
pnpm --filter playground exec playwright install chromium
pnpm test:e2e                  # Playwright + axe
```

To test against an installed Chrome instead of Playwright's download, set `CHROME_PATH`.

## Add a component

```sh
pnpm new:component accordion --parts Item,Trigger,Content   # --no-zag for a static one
pnpm install
pnpm check:components                                        # lists what is still missing
```

`new:component` writes the source skeleton, playground page, spec, docs page and demo, and registers the component in the four places that list them. Fill in every `TODO` it leaves. `check:components` runs in CI and fails while a component is half added.

## Try the CLI against a local build

To test registry or CLI changes before they ship, point the CLI at a local build:

```sh
pnpm build                                      # also writes apps/www/public/r/*.json
cd path/to/your-astro-site
node path/to/eris-ui/packages/cli/dist/index.js init --registry path/to/eris-ui/apps/www/public/r
node path/to/eris-ui/packages/cli/dist/index.js add dialog tabs
```

## How a component works

Each component is `.astro` markup with `data-part` attributes, plus one `.ts` file that starts a Zag machine on the client and spreads its props onto those parts. `mountAll()` starts machines on page load and stops them before a view transition swaps the page. See [`packages/components/src/components/dialog`](./packages/components/src/components/dialog).

## Pull requests

CI runs `check:components`, `check`, `build`, `test` and `test:e2e`. Run them locally before you open a pull request.
