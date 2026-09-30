import { access, readFile, writeFile } from 'node:fs/promises'

// Only dist/client is deployed; the Start server bundle is a build artifact.
await access('dist/client/preface.html')
const base = process.env.BASE_PATH || '/'
await writeFile('dist/client/404.html', `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Страница не найдена</title><body><main><h1>Страница не найдена</h1><p><a href="${base}">Вернуться к книге</a></p></main></body></html>`)
await writeFile('dist/client/.nojekyll', '')
if (process.env.SITE_URL) {
  const origin = new URL(process.env.SITE_URL).origin
  const baseUrl = new URL(base, origin).href
  const pages = JSON.parse(await readFile('src/generated/manifest.json', 'utf8'))
  const urls = ['/', ...pages.map(({ slug }) => `/${slug}.html`)]
  const sitemap = urls
    .map((path) => `  <url><loc>${new URL(path.slice(1), baseUrl).href}</loc></url>`)
    .join('\n')
  await writeFile(
    'dist/client/sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap}\n</urlset>\n`,
  )
  await writeFile('dist/client/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml', baseUrl).href}\n`)
}
console.log('Static site ready in dist/client (no Node.js server required).')
