---
"eris-ui": patch
---

Fix `yarn dlx eris-ui init` and `add` in Yarn 1 projects. The CLI no longer passes `yarn dlx`'s Plug'n'Play loader on to the commands it runs, which made `astro add tailwind` and installs fail with "Cannot find module 'pnpapi'".
