# eris-ui

Add [Eris UI](https://erisui.dev) components to an Astro project. It copies components into your project as plain `.astro` and `.ts` files, which you can then edit like your own code.

```sh
npx eris-ui init          # Tailwind v4, the Eris theme, the @/ alias and eris.json
npx eris-ui add dialog    # copies dialog (and button, eris-core) into src/components/ui
npx eris-ui diff dialog   # shows how your copy differs from the latest version
```

## What `init` does

1. Runs `astro add tailwind` if Tailwind v4 is not set up.
2. Imports `eris-theme.css` right after `@import "tailwindcss"` in your global CSS.
3. Adds the `"@/*": ["./src/*"]` path alias to `tsconfig.json`.
4. Writes `eris.json` and installs `eris-core` (lifecycle helpers, `cn()`, the theme).

## Options

| Flag                    | Use                                                              |
| ----------------------- | ---------------------------------------------------------------- |
| `--registry <url\|dir>` | Use another registry, or a local folder of registry JSON         |
| `--overwrite`           | `add`: replace files you have changed (they are kept by default) |
| `--skip-install`        | Do not run your package manager                                  |
| `--cwd <dir>`           | Run against another project folder                               |

`add` installs any missing npm dependencies with the package manager your lockfile points to (npm, pnpm, yarn or bun).
