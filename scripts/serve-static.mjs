import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'

const root = resolve('dist/client')
const base = process.env.BASE_PATH || '/'
const port = Number(process.env.PORT || 4173)
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.ttf': 'font/ttf' }
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (!pathname.startsWith(base)) throw new Error('Outside base')
    let file = resolve(root, pathname.slice(base.length))
    if (file !== root && !file.startsWith(root + sep)) throw new Error('Outside root')
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html')
    const body = await readFile(file)
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
  }
}).listen(port, '0.0.0.0', () => console.log(`Static preview: http://localhost:${port}${base}`))
