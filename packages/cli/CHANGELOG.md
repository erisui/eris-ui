# eris-ui

## 0.1.1

### Patch Changes

- b1fdca2: Fix `yarn dlx eris-ui init` and `add` in Yarn 1 projects. The CLI no longer passes `yarn dlx`'s Plug'n'Play loader on to the commands it runs, which made `astro add tailwind` and installs fail with "Cannot find module 'pnpapi'".

## 0.1.0

### Minor Changes

- fdc357b: First beta release, published from CI with npm provenance.
