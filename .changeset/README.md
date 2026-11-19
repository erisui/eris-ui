# Changesets

Only the `eris-ui` CLI is published to npm. When a pull request changes what the CLI does, add a changeset:

```sh
pnpm changeset
```

Pick `eris-ui`, choose the bump (patch for fixes, minor for new behaviour while we are on 0.x), and write one line for the changelog. Commit the file it creates with your change.

When changesets land on `main`, the Release workflow opens a "Version Packages" pull request. Merging that pull request publishes the new version to npm from CI, with provenance.

Components, the site and the registry are not npm packages and don't need changesets.
