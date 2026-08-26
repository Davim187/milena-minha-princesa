import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

function githubPagesBase() {
  const fromEnv = process.env.VITE_BASE_PATH
  if (fromEnv) {
    if (fromEnv === '/') return '/'
    return fromEnv.endsWith('/') ? fromEnv : `${fromEnv}/`
  }

  const repository = process.env.GITHUB_REPOSITORY
  if (repository) {
    const repoName = repository.split('/')[1]
    return `/${repoName}/`
  }

  return '/'
}

function spaFallback() {
  return {
    name: 'github-pages-spa-fallback',
    closeBundle() {
      const index = resolve('dist/index.html')
      if (existsSync(index)) {
        copyFileSync(index, resolve('dist/404.html'))
      }
    },
  }
}

export default defineConfig({
  base: githubPagesBase(),
  plugins: [react(), tailwindcss(), spaFallback()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
  },
})
