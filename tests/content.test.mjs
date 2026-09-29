import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { load } from 'cheerio'
import { compilePage } from '../scripts/content.mjs'

test('translations preserve prose, whitespace, links and code verbatim', () => {
  const html = '<html><head><title>Sample</title></head><body><p id="p">Model,\n <em>model</em>! <a href="/book/test.html#p">Model</a></p><pre><code>model = Model()</code></pre><script>bad()</script></body></html>'
  const result = compilePage(html, { dictionary: { model: 'модель' }, base: '/repo/', slugs: new Set(['test']) })
  const $ = load(result.html)
  assert.equal($('#p').text(), 'Model,\n model! Model')
  assert.deepEqual(result.words, { model: 'модель' })
  assert.equal(result.translated, 3)
  assert.equal($('[data-ru]').length, 0)
  assert.equal($('a').attr('href'), '/repo/test.html#p')
  assert.equal($('code').html(), 'model = Model()')
  assert.equal($('script').length, 0)
})

test('local replacements, notes and chapter translations compose safely', () => {
  const result = compilePage('<p id="p">Original</p>', {
    dictionary: { changed: 'общий перевод' }, slugs: new Set(),
    edits: { replacements: [{ selector: '#p', text: 'Changed & better' }], notes: [{ after: '#p', title: '<заметка>', html: '<p>Мой текст</p>' }], translations: { changed: 'заменено' } },
  })
  const $ = load(result.html)
  assert.equal($('#p').text(), 'Changed & better')
  assert.equal(result.words.changed, 'заменено')
  assert.equal($('.reader-note strong').text(), '<заметка>')
  assert.equal($('.reader-note [data-ru]').length, 0)
  assert.throws(() => compilePage('<p>One</p><p>Two</p>', { dictionary: {}, slugs: new Set(), edits: { replacements: [{ selector: 'p', text: 'Oops' }] } }), /expected exactly 1/)
})

test('passage-specific translations preserve markup and only relevant phrases are shipped', () => {
  const result = compilePage('<p id="target">In order <em>to</em> allocate an order.</p><p>Other passage.</p>', {
    dictionary: { order: 'заказ' }, slugs: new Set(),
    phrases: { 'in order to': { order: 'того' }, 'not present': { present: 'присутствующий' } },
    edits: { contexts: [{ selector: '#target', translations: { allocate: 'распределить' } }] },
  })
  const $ = load(result.html)
  assert.equal($('#target').text(), 'In order to allocate an order.')
  assert.equal($('#target em').text(), 'to')
  assert.equal($('#target').attr('data-translation-context'), 'passage-0')
  assert.equal(result.contexts['passage-0'].translations.allocate, 'распределить')
  assert.deepEqual(result.phrases, { 'in order to': { order: 'того' } })
})

test('all book words have translations and every static page exists', async () => {
  const report = JSON.parse(await readFile('src/generated/translation-report.json', 'utf8'))
  assert.deepEqual(report.missing, {}, 'Add new vocabulary to content/translations/overrides.json')
  assert.equal(report.translated, report.total)
  const manifest = JSON.parse(await readFile('src/generated/manifest.json', 'utf8'))
  assert.equal(manifest.length, 23)
  await assert.rejects(access('dist/client/book'), { code: 'ENOENT' })
  for (const { slug } of manifest) await access(`dist/client/${slug}.html`)
})

test('every local image and chapter link resolves in static output', async () => {
  const manifest = JSON.parse(await readFile('src/generated/manifest.json', 'utf8'))
  const base = process.env.BASE_PATH || '/'
  const files = new Set()
  for (const { slug } of manifest) {
    const $ = load(await readFile(`dist/client/${slug}.html`, 'utf8'))
    for (const el of $('[src], a[href], link[href]').toArray()) {
      const url = $(el).attr('src') || $(el).attr('href')
      if (!url || !url.startsWith(base) || url.startsWith('//')) continue
      assert.ok(!url.startsWith(`${base}book/`), `Old book prefix: ${url}`)
      files.add(url.slice(base.length).split(/[?#]/)[0])
    }
  }
  for (const file of files) await access(`dist/client/${file}`)
})
