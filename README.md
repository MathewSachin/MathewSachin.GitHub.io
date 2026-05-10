
# MathewSachin.GitHub.io

Personal website and blog built with [Astro](https://astro.build/).

## Contributor Notes

- Prefer `.mdx` for all new blog posts. Use filenames like `YYYY-MM-DD-slug.mdx`.
- For local validation and Copilot work, build with `NODE_ENV=development npm run build` so the build matches the repo's testing configuration.
- Run validation in this order from the repo root:
  1. `NODE_ENV=development npm run build`
  2. `npm test`
  3. `npm run check`
  4. `npm run test:e2e` when browser-facing changes are involved


## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- npm 10+

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/MathewSachin/MathewSachin.GitHub.io.git
   cd MathewSachin.GitHub.io
   ```

2. Install dependencies (Mac):

   ```bash
   npm ci
   ```

### Run Locally

Start the Astro development server:

```bash
npm run dev
```

The site will be available at <http://localhost:4321> by default.

## Build

Create a local/testing build (matches Copilot and CI test builds):

```bash
NODE_ENV=development npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Deployment

Deployment is automated with GitHub Actions and publishes the generated site to GitHub Pages.
