import fs from 'node:fs/promises'
import path from 'node:path'

const rootDir = process.cwd()
const sourceDir = path.resolve(rootDir, 'dist', 'full', 'client')
const targetDir = path.resolve(rootDir, 'dist', 'gh-pages')

async function assertSourceExists() {
  try {
    const stat = await fs.stat(sourceDir)
    if (!stat.isDirectory()) {
      throw new Error()
    }
  } catch {
    throw new Error(
      `[gh-pages] Source build not found: ${sourceDir}. Run "npm run build:full" first.`
    )
  }
}

async function prepareArtifact() {
  await assertSourceExists()

  await fs.rm(targetDir, { recursive: true, force: true })
  await fs.cp(sourceDir, targetDir, { recursive: true, force: true })
  await removeMacMetadataFiles(targetDir)
  await fs.writeFile(path.join(targetDir, '.nojekyll'), '', 'utf8')

  const relativeTarget = path.relative(rootDir, targetDir)
  console.log(`[gh-pages] artifact ready: ${relativeTarget}`)
}

async function removeMacMetadataFiles(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true })
  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name)
    if (entry.isDirectory()) {
      await removeMacMetadataFiles(entryPath)
      continue
    }
    if (entry.isFile() && entry.name === '.DS_Store') {
      await fs.rm(entryPath, { force: true })
    }
  }
}

await prepareArtifact()
