# www

The erisui.dev website: landing page, docs with live demos, and the public registry at `/r/*.json` that the CLI reads.

```sh
pnpm --filter www dev        # http://localhost:4321
pnpm --filter www build      # builds the registry first, then the site into dist/
pnpm --filter www test:e2e   # every page, axe, the registry and the demos
pnpm --filter www deploy     # Cloudflare Workers static assets, after build
```

Docs pages are MDX in `src/content/docs`. Each demo is an `.astro` file in `src/demos` that imports components from `@/components/ui/...`, the same path a user's project has after `eris-ui add`. A page renders the demo and shows its source from the same file through a `?raw` import, and install commands come from the registry metadata, so neither can drift from the code.
