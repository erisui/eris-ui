<p align="center">
  <img src="https://raw.githubusercontent.com/erisui/brand/main/logo/svg/eris-lockup-dark.svg" alt="Eris UI" height="48">
</p>

# Eris UI

Accessible UI components you can drop into any Astro project. Plain `.astro` files, behaviour from [Zag](https://zagjs.com) state machines, styled with Tailwind v4. No framework islands.

> Early work. Not ready to install yet.

## Repo layout

| Path                      | What it is                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `packages/components`     | Source of truth for every free component, plus `eris-core` (mount lifecycle, helpers, theme) |
| `apps/playground`         | Bare Astro app for trying components; Playwright and axe tests run against it                |
| `apps/docs`               | erisui.dev (planned)                                                                         |
| `packages/registry-build` | Turns component source into registry JSON (planned)                                          |
| `packages/cli`            | `eris-ui` CLI: `init`, `add`, `diff` (planned)                                               |
| `tooling/tsconfig`        | Shared TypeScript config                                                                     |

## Develop

Requires Node 22.12+ and pnpm 10.

```sh
pnpm install
pnpm dev                       # playground at http://localhost:4321
pnpm build
pnpm check                     # astro check + tsc
pnpm --filter playground exec playwright install chromium
pnpm test:e2e                  # Playwright + axe
```

To test against an installed Chrome instead of Playwright's download, set `CHROME_PATH`.

## How a component works

Each component is `.astro` markup with `data-part` attributes, plus one `.ts` file that starts a Zag machine on the client and spreads its props onto those parts. `mountAll()` starts machines on page load and stops them before a view transition swaps the page. See [`packages/components/src/components/dialog`](./packages/components/src/components/dialog).

Architecture: [erisui/docs](https://github.com/erisui/docs/blob/main/architecture.md). Visual language: [erisui/brand](https://github.com/erisui/brand/tree/main/visual-language).

## License

MIT
