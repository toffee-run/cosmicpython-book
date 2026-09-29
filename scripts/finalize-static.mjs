import { access, writeFile } from 'node:fs/promises'

// Only dist/client is deployed; the Start server bundle is a build artifact.
await access('dist/client/preface.html')
const base = process.env.BASE_PATH || '/'
await writeFile('dist/client/404.html', `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Страница не найдена</title><body><main><h1>Страница не найдена</h1><p><a href="${base}">Вернуться к книге</a></p></main></body></html>`)
await writeFile('dist/client/.nojekyll', '')
console.log('Static site ready in dist/client (no Node.js server required).')
