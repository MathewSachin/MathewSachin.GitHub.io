# MathewSachin.GitHub.io
My Website including a blog.

## Local Development

### Prerequisites

- [Ruby](https://www.ruby-lang.org/en/documentation/installation/) (version 2.7 or higher recommended)
- [Bundler](https://bundler.io/) (`gem install bundler`)

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/MathewSachin/MathewSachin.GitHub.io.git
   cd MathewSachin.GitHub.io
   ```

2. Install dependencies (Mac):

   ```bash
   bundle install
   npm ci
   brew install vips
   ```

### Running Locally

Start the Jekyll development server:

```bash
bundle exec jekyll serve
```

The site will be available at <http://localhost:4000>.

To include draft posts in the build, use:

```bash
bundle exec jekyll serve --drafts
```

To make the server accessible on your local network, use:

```bash
bundle exec jekyll serve --host 0.0.0.0
```

## JavaScript → TypeScript (Phase 1)

TypeScript is now enabled for a safe first migration phase with generated JavaScript output kept in place for runtime compatibility.

### TypeScript commands

```bash
npm run typecheck   # runs tsc in noEmit mode
npm run build:ts    # compiles migrated .ts files to .js
```

`npm run build` and `npm test` now compile the migrated TypeScript files before building/running tests.
