# @eris-ui/components

The source for every free Eris UI component. Users never install this package; the CLI copies these files into their projects through the registry.

```text
src/
  lib/eris/      eris-core: mountAll, part helpers, cn()
  styles/        theme.css (tokens, Tailwind @theme, the Eris curve)
  components/    one folder per component, plus a meta.ts for the registry
  registry.ts    the list of items registry-build reads
```

Each component is `.astro` markup with `data-part` attributes and one `.ts` file that starts a Zag machine and spreads its props onto those parts. Dialog is the reference to copy.

To add a component, create its folder with a `meta.ts`, list it in `registry.ts`, and add a page and tests in `apps/playground`.
