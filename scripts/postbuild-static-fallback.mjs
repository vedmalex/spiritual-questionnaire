import fs from 'node:fs/promises'
import path from 'node:path'

const buildOutDir = process.env.BUILD_OUT_DIR || 'dist'
const clientDir = path.resolve(process.cwd(), buildOutDir, 'client')
const indexPath = path.join(clientDir, 'index.html')
const fallbackPath = path.join(clientDir, '404.html')

try {
  const indexContent = await fs.readFile(indexPath, 'utf8')
  const currentFallback = await fs.readFile(fallbackPath, 'utf8').catch(() => '')

  if (currentFallback !== indexContent) {
    await fs.writeFile(fallbackPath, indexContent, 'utf8')
  }

  const relativeFallback = path.relative(process.cwd(), fallbackPath)
  console.log(`[postbuild] static fallback ready: ${relativeFallback}`)
} catch {
  console.warn('[postbuild] skipped 404.html generation: index.html not found')
}
