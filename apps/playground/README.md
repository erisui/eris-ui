# playground

A bare Astro site for trying components while you build them. It imports straight from `packages/components`, so edits show up without a registry build. View transitions are on, so every page also checks that components mount and clean up between pages.

```sh
pnpm dev          # http://localhost:4321
pnpm test:e2e     # Playwright and axe tests in tests/
```

Set `CHROME_PATH` to run the tests against an installed Chrome instead of Playwright's own download.
