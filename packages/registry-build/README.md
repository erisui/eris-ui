# @eris-ui/registry-build

Reads `packages/components/src/registry.ts` and writes the registry to `apps/www/public/r/`: one `<name>.json` per item in shadcn's registry-item format, plus `registry.json`.

```sh
pnpm --filter @eris-ui/registry-build build
```

The build fails if a file listed in `meta.ts` is missing, or if a file imports an npm package or another Eris item that its `meta.ts` does not declare. `pnpm build` at the root runs it too.
