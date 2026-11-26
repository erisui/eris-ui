# Security policy

## Reporting a vulnerability

Please don't open a public issue for a security problem. Email **hello@erisui.dev** instead, with:

- what the problem is and where (a component, the `eris-ui` CLI, the registry at `erisui.dev/r`, or the site)
- steps to reproduce it, or a proof of concept
- the versions involved: `eris-ui` CLI, Astro, browser

You'll get a reply within three working days. Once a fix is out, the release notes will credit you unless you'd rather not be named.

## Supported versions

Eris UI is in beta. Fixes go into the latest `eris-ui` release and the latest components in the registry. Components you've already added are your own copies, so run `npx eris-ui@latest diff <component>` to see whether a fix touches them.
