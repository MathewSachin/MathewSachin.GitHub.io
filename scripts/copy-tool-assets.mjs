/**
 * Post-build script: copies all static assets from each tool's source directory
 * (tools/<id>/) to the corresponding dist/tools/<id>/ directory.
 *
 * The Astro dynamic page ([tool].astro) renders each tool's index.html as an Astro
 * page, but the raw tool directories contain additional static assets (CSS, JS,
 * icons, sub-directories) that also need to be served. Astro's public/ directory only
 * holds a partial copy of the tool assets; this script ensures the full set is
 * available in dist/ after the build.
 *
 * Files excluded from the copy:
 *   - index.html  (the Jekyll source page — Astro generates the real page)
 *
 * Run via: npm run copy-tool-assets (called automatically as part of npm run build)
 */

import { readdir, cp, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const REPO_ROOT = join(__dirname, '..')
const TOOLS_SRC = join(REPO_ROOT, 'tools')
const TOOLS_DEST = join(REPO_ROOT, 'dist', 'tools')

const SKIP_FILES = new Set(['index.html'])

let totalFiles = 0

const toolDirs = await readdir(TOOLS_SRC, { withFileTypes: true })
for (const entry of toolDirs.filter(e => e.isDirectory())) {
  const srcDir = join(TOOLS_SRC, entry.name)
  const destDir = join(TOOLS_DEST, entry.name)
  await mkdir(destDir, { recursive: true })

  const files = await readdir(srcDir, { withFileTypes: true })
  for (const file of files) {
    if (SKIP_FILES.has(file.name)) continue
    await cp(join(srcDir, file.name), join(destDir, file.name), {
      recursive: true,
      force: true,
    })
    totalFiles++
  }
}

console.log(`Tool assets copied: ${totalFiles} items written to dist/tools/`)
