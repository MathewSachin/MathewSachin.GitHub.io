# Copilot instructions for this repository

This repository is a personal site/blog built with Astro 6 + Svelte 5 and deployed as a static site to GitHub Pages.

## Start here

- Read `package.json` for the canonical commands.
- Read `astro.config.ts` for routing, `BASE_URL` handling, SVG/image behavior, and static build settings.
- Read `src/content.config.ts` before changing blog posts or tool docs.
- Read `src/pages/tools/[id]/index.astro` before adding or wiring a tool component.
- Read `src/utils/posts.ts` and `src/pages/search-index.json.ts` before changing blog URLs, metadata, or search behavior.

## Repository map

- `src/content/blog/`: blog posts (`.md`/`.mdx`) loaded through Astro content collections.
- `src/content/tool-docs/`: MDX docs/frontmatter for tools shown under `/tools/`.
- `src/components/`: Astro and Svelte UI components.
- `src/components/tools/` + `src/scripts/tools/`: interactive tool UIs and browser-side logic.
- `src/pages/`: Astro routes, including generated blog, tools, search index, and feeds.
- `tests/*.test.ts`: Node unit/integration tests.
- `tests/**/*.spec.ts`: Playwright browser tests.
- `.github/workflows/`: CI/build/deploy definitions; `build-site.yml` and `frontend-tests.yml` are the important ones.

## Important project conventions

- New blog posts should always be created as `.mdx` files, with filenames following `YYYY-MM-DD-slug.mdx` (single-digit month/day is accepted by the loader, but URLs are zero-padded).
- Blog URLs are generated as `/blog/YYYY/MM/DD/slug.html`; preserve that shape when changing routing helpers.
- Tool pages are content-driven:
  - metadata lives in `src/content/tool-docs/<id>.mdx`
  - `component` frontmatter selects the interactive component
  - the component must be handled in `src/pages/tools/[id]/index.astro`
- Interactive features are usually Astro shells with Svelte islands (`client:load` or `client:only`), not full SPA pages.
- Prefer `import.meta.env.BASE_URL`/`BASE` for internal links and asset URLs. PR previews build with `ASTRO_BASE`, so hardcoded root-relative paths often break previews.
- `trailingSlash` is always enabled and the site is fully static.
- Do not edit generated output in `dist/`, Playwright artifacts in `test-results/`, or dependencies in `node_modules/`.

## Validation order

Run validations from the repo root:

1. `NODE_ENV=development npm run build`
2. `npm test`
3. `npm run check`
4. `npm run test:e2e` when browser-facing behavior changes

Why this order matters:

- Copilot should always set `NODE_ENV=development` before building in this repository. Testing builds disable production-only integrations and match the existing CI testing path.
- `npm test` reads `dist/search-index.json`, so unit tests can fail if you skip `npm run build` first.
- Playwright serves the built `dist/` folder on port 4000 via `playwright.config.ts`, so e2e tests also expect a fresh build.

## Errors/workarounds observed while onboarding

- `npm run check` currently fails on the main branch because `src/layouts/PostLayout.astro` passes an Astro image object to a prop typed as `string`. Treat this as a pre-existing issue unless your task touches that area.
- `npm test` fails with `ENOENT ... dist/search-index.json` if run before `npm run build`. Workaround: always build first.
- `npm run test:e2e` fails if Playwright browsers are not installed. Workaround: run `npx playwright install chromium`.
- `tests/av-sync.spec.ts` requires `ffprobe` from FFmpeg. Workaround: install FFmpeg (`apt-get install ffmpeg` on Linux, `brew install ffmpeg` on macOS). CI already does this in `.github/workflows/frontend-tests.yml`.

## CI notes

- CI uses Node 22 and `npm ci`.
- `build-site.yml` runs testing builds with `NODE_ENV=development npm run build` when `testing: true`, and production builds otherwise.
- `frontend-tests.yml` downloads the built `dist/` artifact, installs Playwright Chromium, installs FFmpeg, and then runs `npm run test:e2e`.
- `copilot-setup-steps.yml` should preinstall the tools Copilot needs here (`npm ci`, Playwright Chromium, and FFmpeg) and set `NODE_ENV=development` in `GITHUB_ENV`.

## Astro-specific caution

- `astro.config.ts` enables `image.dangerouslyProcessSVG: true` for repository-managed SVG assets. Do not loosen SVG handling for untrusted/user-provided input.
