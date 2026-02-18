import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath, URL } from 'url'
import fs from 'node:fs/promises'
import path from 'node:path'

const buildId = process.env.VITE_APP_BUILD_ID || new Date().toISOString()
const rawProfile = String(process.env.VITE_APP_PROFILE || 'full').trim().toLowerCase()
const appProfile = rawProfile === 'student' || rawProfile === 'curator' ? rawProfile : 'full'
const rawBase = String(process.env.VITE_APP_BASE || '/').trim()
const appBase =
  rawBase === './'
    ? '/'
    : rawBase.startsWith('/')
      ? rawBase.endsWith('/')
        ? rawBase
        : `${rawBase}/`
      : `/${rawBase.replace(/^\/+|\/+$/g, '')}/`
const outDir = process.env.BUILD_OUT_DIR || 'dist'
const QUESTIONNAIRES_DIR = path.join('public', 'questionnaires')
const QUESTIONNAIRES_INDEX_FILE = 'index.json'

async function collectQuestionnaireFiles(
  absoluteDir: string,
  relativeDir = ''
): Promise<string[]> {
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const absolutePath = path.join(absoluteDir, entry.name)
    const relativePath = relativeDir
      ? path.posix.join(relativeDir, entry.name)
      : entry.name

    if (entry.isDirectory()) {
      files.push(...(await collectQuestionnaireFiles(absolutePath, relativePath)))
      continue
    }

    if (
      entry.isFile() &&
      relativePath.toLowerCase().endsWith('.json') &&
      relativePath !== QUESTIONNAIRES_INDEX_FILE
    ) {
      files.push(relativePath)
    }
  }

  return files
}

async function generateQuestionnairesIndex(rootDir: string): Promise<void> {
  const questionnairesDir = path.resolve(rootDir, QUESTIONNAIRES_DIR)
  await fs.mkdir(questionnairesDir, { recursive: true })

  const files = (await collectQuestionnaireFiles(questionnairesDir)).sort((left, right) =>
    left.localeCompare(right)
  )

  const nextContent = `${JSON.stringify(files)}\n`
  const indexPath = path.join(questionnairesDir, QUESTIONNAIRES_INDEX_FILE)
  const currentContent = await fs.readFile(indexPath, 'utf8').catch(() => '')

  if (currentContent !== nextContent) {
    await fs.writeFile(indexPath, nextContent, 'utf8')
  }
}

function questionnairesIndexPlugin(): Plugin {
  let rootDir = process.cwd()
  let generationInFlight: Promise<void> | null = null

  const isWithinQuestionnairesDir = (targetPath: string): boolean => {
    const questionnairesDir = path.resolve(rootDir, QUESTIONNAIRES_DIR)
    const relative = path.relative(questionnairesDir, targetPath)
    return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative)
  }

  const runGeneration = (): Promise<void> => {
    if (!generationInFlight) {
      generationInFlight = generateQuestionnairesIndex(rootDir).finally(() => {
        generationInFlight = null
      })
    }
    return generationInFlight
  }

  const shouldRegenerateFor = (filePath: string): boolean => {
    if (!isWithinQuestionnairesDir(filePath)) {
      return false
    }
    if (path.basename(filePath) === QUESTIONNAIRES_INDEX_FILE) {
      return false
    }
    return filePath.toLowerCase().endsWith('.json')
  }

  return {
    name: 'questionnaires-index-generator',
    configResolved(config) {
      rootDir = config.root
    },
    async buildStart() {
      await runGeneration()
    },
    configureServer(server) {
      const questionnairesDir = path.resolve(rootDir, QUESTIONNAIRES_DIR)
      void runGeneration()
      server.watcher.add(questionnairesDir)

      const regenerateIfNeeded = (filePath: string) => {
        if (!shouldRegenerateFor(filePath)) {
          return
        }
        void runGeneration()
      }

      const regenerateForDirectory = (dirPath: string) => {
        if (!isWithinQuestionnairesDir(dirPath)) {
          return
        }
        void runGeneration()
      }

      server.watcher.on('add', regenerateIfNeeded)
      server.watcher.on('unlink', regenerateIfNeeded)
      server.watcher.on('change', regenerateIfNeeded)
      server.watcher.on('addDir', regenerateForDirectory)
      server.watcher.on('unlinkDir', regenerateForDirectory)
    },
  }
}

const config = defineConfig({
  base: appBase,
  define: {
    'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(buildId),
    'import.meta.env.VITE_APP_PROFILE': JSON.stringify(appProfile),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
  },
  plugins: [
    questionnairesIndexPlugin(),
    devtools(),
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart({
      spa: {
        enabled: true,
        prerender: {
          outputPath: '/index.html',
        },
      },
    }),
    viteReact(),
  ],
})

export default config
