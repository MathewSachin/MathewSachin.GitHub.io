---
title: "Using a Custom Docker Image to Speed Up GitHub Actions Builds"
icon: "fab fa-docker"
tags: [github-actions, docker, ci-cd, jekyll, devops, tutorial]
highlight: true
pintora: true
related:
  - /blog/2026/04/01/pr-preview-setup
  - /blog/2026/03/12/ai-blog-generation-flow
  - /blog/2026/03/25/how-site-search-works
---

*Every push to this blog triggers a GitHub Actions build — Jekyll, Ruby gems, Node packages, libvips image processing, html-proofer. Without a custom Docker image, that build reinstalls the entire toolchain from scratch every single time. Here's how a pre-baked container image makes it fast.*

## The Problem: Reinstalling Everything on Every Run

GitHub Actions runners are ephemeral. Every time a workflow runs, you get a fresh Ubuntu VM with nothing on it. That's great for reproducibility, but terrible for build time if your build needs a non-trivial toolchain.

This blog's build needs:

| Tool | Why it's needed | Install cost |
|---|---|---|
| **Node.js 20** | Builds the Orama search index and bundles scripts | Fast — NodeSource apt package |
| **libvips** | `jekyll_picture_tag` uses it to generate responsive images | **Slow** — 6-7 min apt install |
| **Ruby 3.3.7** | Runs Jekyll and all the gems | Moderate — compiled from source via ruby-build |
| **Bundler + gems** | Jekyll, plugins, html-proofer | Fast with gem cache |

The libvips install is the real killer. `libvips-dev` and its dependencies pull in a large tree of image-processing libraries — on a fresh GitHub Actions runner, `apt-get install libvips-dev` consistently takes **6-7 minutes**. That's before a single line of Jekyll has run.

Multiply that across dozens of pushes while iterating on a new post or layout change, and you're burning a lot of time waiting.

## The Fix: Pre-Bake a Custom Docker Image

Instead of installing the toolchain at build time, install it once into a Docker image, push it to a registry, and tell GitHub Actions to run your job inside that container.

The workflow job definition changes from this:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Install libvips
        run: apt-get install libvips-dev  # takes 6-7 minutes
      - name: Install Ruby
        run: # ... compile from source via ruby-build
      # ... etc
```

To this:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    container:
      image: ghcr.io/mathewsachin/mathewsachin-github-io-ci:latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      # Ruby, Node, libvips already there — start building immediately
```

The toolchain is already there. The job starts in seconds, not minutes.

## How This Site Does It

There are two pieces: the Dockerfile that defines what goes in the image, and the workflow that builds and pushes the image to GitHub Container Registry (GHCR).

### The Dockerfile

The CI image lives at `ci/Dockerfile` in the repository:

```dockerfile
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Core tools + libvips + build deps for native Ruby/Node extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git build-essential pkg-config \
    libvips-dev libvips-tools \
    libffi-dev libgmp-dev libyaml-dev zlib1g-dev libssl-dev \
    libreadline-dev autoconf bison \
    locales \
    && locale-gen en_US.UTF-8 \
    && rm -rf /var/lib/apt/lists/*

# ---- Node.js 20 (via NodeSource) ----
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# ---- Ruby 3.3 via ruby-build ----
RUN git clone --depth 1 https://github.com/rbenv/ruby-build.git /tmp/ruby-build \
    && /tmp/ruby-build/install.sh \
    && rm -rf /tmp/ruby-build

RUN ruby-build 3.3.7 /opt/ruby

ENV PATH="/opt/ruby/bin:${PATH}"

RUN gem update --system --no-document && gem install bundler --no-document
```

Key decisions:

- **`libvips-dev` and `libvips-tools`** are included because `jekyll_picture_tag` calls into libvips at build time to generate responsive image variants in WebP format. If libvips is missing, image processing fails silently or crashes the build.
- **Ruby is compiled from source** via `ruby-build` rather than installed from the system package. The system Ruby on Ubuntu 24.04 is 3.1; this site needs 3.3. `ruby-build` gives full version control.
- **Bundler is installed but gems are not**. The gems (`jekyll`, plugins, etc.) live in the repository's `Gemfile.lock` and are installed at build time with `bundle install`. That way the image doesn't need to change every time a gem is updated.
- **Node.js is installed but `node_modules` are not**. Same logic: `npm ci` runs at build time against the committed `package-lock.json`.

The split — bake in slow, stable tools; install fast, frequently-changing packages at build time — keeps the image small and long-lived.

### The Image Build Workflow

A separate workflow (`build-ci-image.yml`) builds and pushes the image whenever the Dockerfile changes:

```yaml
on:
  push:
    branches: [ master ]
    paths:
      - "ci/Dockerfile"
      - ".github/workflows/build-ci-image.yml"
  workflow_dispatch:
```

It only runs when `ci/Dockerfile` or the workflow file itself changes — not on every push. The slow libvips installation and the Ruby compilation happen here, once, and the result is cached as a container image.

The image is pushed to [GitHub Container Registry](https://ghcr.io) using the built-in `GITHUB_TOKEN` for authentication:

```yaml
- uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

No separate secrets or registry accounts needed — GHCR is integrated directly with GitHub.

#### Tagging Strategy

The image gets two tags:

```yaml
- name: Generate image tags
  id: tags
  run: |
    DOCKERFILE_HASH=$(sha256sum ci/Dockerfile | cut -c1-12)
    echo "tags=ghcr.io/mathewsachin/mathewsachin-github-io-ci:latest,ghcr.io/mathewsachin/mathewsachin-github-io-ci:df-${DOCKERFILE_HASH}" >> "$GITHUB_OUTPUT"
```

- **`latest`** — what the build workflow always pulls. Points to the most recently built image.
- **`df-<hash>`** — a content-addressed tag derived from the first 12 characters of the Dockerfile's SHA-256 hash. This is immutable: if you know the Dockerfile content, you know the exact image. Useful for debugging or pinning a build to a specific image without relying on `latest`.

### The Build Workflow

The site build job (`build-site.yml`) uses the image with a single `container:` block:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    container:
      image: ghcr.io/mathewsachin/mathewsachin-github-io-ci:latest
```

GitHub Actions pulls the container image, starts the job inside it, and every subsequent step runs inside that environment. The checkout, `npm ci`, `bundle install`, and `jekyll build` steps all run with Ruby, Node, and libvips already available.

## The Full Picture

<pre class="pintora">
activityDiagram
  partition "build-ci-image.yml - runs once per Dockerfile change" {
    :ci/Dockerfile changed;
    :apt-get install libvips-dev + build tools;
    :Install Node.js 20 via NodeSource;
    :ruby-build compiles Ruby 3.3.7 from source;
    :gem install bundler;
    :Push image to GHCR with latest and df-hash tags;
  }
  partition "build-site.yml - runs on every push" {
    :Pull CI image from GHCR;
    :npm ci;
    :npm run build - Orama index + JS bundle;
    :bundle install - Jekyll + plugins;
    :jekyll build;
    :htmlproofer;
    :Upload site artifact;
  }
</pre>

The slow, infrequent work happens in the first workflow. The fast, frequent work happens in the second. The 6-7 minute libvips install runs once per Dockerfile change rather than on every commit.

## What Gets Cached vs What Doesn't

The image caches the toolchain. The build still installs packages on every run — `npm ci` and `bundle install`. But those are fast:

- `npm ci` fetches from the npm registry against a lockfile. GitHub Actions has its own transparent CDN for npm, and the packages for this site are small.
- `bundle install` is further accelerated by an explicit gem cache in `build-site.yml`:

```yaml
- name: Cache Ruby gems
  uses: actions/cache@v4
  with:
    path: vendor/bundle
    key: ${{ runner.os }}-gems-${{ hashFiles('Gemfile.lock') }}
    restore-keys: ${{ runner.os }}-gems-
```

The gem cache hits on every push that doesn't change `Gemfile.lock`, which is most of them. So the typical build flow is: pull image (fast — cached by Docker layer), restore gem cache (fast — GitHub cache hit), `npm ci` (fast), `jekyll build` (a few seconds), done.

## Why GHCR Instead of Docker Hub

GitHub Container Registry (GHCR) has a few advantages for this use case:

- **No pull rate limits** for packages in public repos — Docker Hub imposes rate limits for unauthenticated pulls, and GitHub Actions runners share IPs, so you can hit those limits fast.
- **Authentication via GITHUB_TOKEN** — no extra secrets to manage. The token is available in every workflow automatically.
- **Co-located with the code** — the image lives at `ghcr.io/mathewsachin/...`, directly associated with the repository. Easy to find, easy to audit.

For a private repository you'd need to add a `credentials:` block to the `container:` config, but for a public repo the image can be public too and no credentials are needed at pull time.

## When This Pattern Is Worth It

This approach makes sense when:

- Your build needs a tool that takes more than ~30 seconds to install (compiled languages, libvips, ImageMagick, custom system libraries)
- You build frequently — on every PR, every push, across multiple branches
- The toolchain is stable — you're not changing Ruby versions every week

It's overkill when:

- Your build only needs tools that are already on `ubuntu-latest` (most common languages are pre-installed)
- You build rarely enough that the install time doesn't add up
- The image build complexity outweighs the time saved

For this blog — Jekyll with `jekyll_picture_tag` requiring libvips — the 6-7 minute install cost alone justifies the custom image.

## Summary

| Component | Role |
|---|---|
| `ci/Dockerfile` | Defines the CI environment: Ubuntu 24.04, Node.js 20, Ruby 3.3.7 (compiled), libvips, Bundler |
| `build-ci-image.yml` | Builds and pushes the image to GHCR on Dockerfile changes |
| `build-site.yml` | Runs the actual site build inside the pre-baked container |
| GHCR | Stores the image at `ghcr.io/mathewsachin/mathewsachin-github-io-ci` |
| Dockerfile hash tag | Immutable content-addressed tag for debugging and pinning |

The build is fast because the slow parts ran a long time ago, and the result is still sitting in a registry waiting to be pulled.

*If you're also running a Jekyll site on GitHub Actions with custom plugins, the {% include post_link.html url="/blog/2026/04/01/pr-preview-setup" text="PR preview setup post" %} is worth reading alongside this one — together they cover the full CI pipeline this site uses.*
