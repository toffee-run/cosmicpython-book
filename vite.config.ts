import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const manifest = JSON.parse(readFileSync('src/generated/manifest.json', 'utf8')) as { slug: string }[]
const base = process.env.BASE_PATH || '/'
if (!base.startsWith('/') || !base.endsWith('/')) {
  throw new Error('BASE_PATH must start and end with /, for example /cosmicpython-book/')
}

export default defineConfig({
  base,
  server: { port: 3000 },
  plugins: [
    {
      name: 'book-content-reload',
      handleHotUpdate({ file, server }) {
        if (!file.includes('/content/')) return
        execFileSync(process.execPath, ['scripts/prepare-content.mjs'], { stdio: 'inherit' })
        server.ws.send({ type: 'full-reload' })
        return []
      },
    },
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: false,
        autoStaticPathsDiscovery: false,
        concurrency: 3,
        failOnError: true,
      },
      pages: [
        { path: '/' },
        ...manifest.map(({ slug }) => ({
          path: `/${slug}.html`,
          prerender: { outputPath: `/${slug}.html` },
        })),
      ],
    }),
    react(),
  ],
})
