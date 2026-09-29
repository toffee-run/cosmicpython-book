import { load } from 'cheerio'
import { wordPattern, normalize } from '../src/lib/translation.mjs'

export { wordPattern, normalize }
const excluded = 'script, style, noscript, pre, code, kbd, samp, svg, math, textarea, .image-source, [data-no-translate]'

export function textNodes($) {
  const result = []
  function visit(node) {
    if (node.type === 'text') {
      if (!$(node).parents(excluded).length) result.push(node)
      return
    }
    for (const child of node.children || []) visit(child)
  }
  visit($.root()[0])
  return result
}

export function applyCustomizations($, edits = {}) {
  const one = (selector) => {
    const target = $(selector)
    if (target.length !== 1) throw new Error(`Selector ${selector} matched ${target.length} elements; expected exactly 1`)
    return target
  }
  for (const replacement of edits.replacements || []) {
    const target = one(replacement.selector)
    if (typeof replacement.text === 'string') target.text(replacement.text)
    else if (typeof replacement.html === 'string') target.html(replacement.html)
    else throw new Error('A replacement requires text or html')
  }
  for (const note of edits.notes || []) {
    const aside = $('<aside class="reader-note" lang="ru" data-no-translate></aside>')
    aside.append($('<strong></strong>').text(note.title || 'Заметка'))
    aside.append($('<div></div>').html(note.html))
    one(note.after).after(aside)
  }
}

export function compilePage(source, { dictionary, phrases = {}, edits = {}, base = '/', slugs }) {
  const $ = load(source)
  const title = $('title').text()
  const styles = $('head style').map((_, el) => $(el).html().replace(/@import[^;]+;/g, '')).get().join('\n')
  // These belong to the original hosted site, not to this static reader.
  $('script, noscript, #disqus_thread').remove()
  applyCustomizations($, edits)
  const contexts = {}
  for (const [i, context] of (edits.contexts || []).entries()) {
    const target = $(context.selector)
    if (target.length !== 1) throw new Error(`Context selector ${context.selector} must match exactly 1 element`)
    const id = `passage-${i}`
    target.attr('data-translation-context', id)
    contexts[id] = { translations: context.translations || {}, phrases: context.phrases || {} }
  }

  $('[href], [src]').each((_, el) => {
    for (const attr of ['href', 'src']) {
      let value = $(el).attr(attr)
      if (!value) continue
      if (value.startsWith('/book/')) {
        value = base + value.slice('/book/'.length)
      } else if (value.startsWith('images/')) {
        value = `${base}${value}`
      } else if (value.startsWith('/images/')) {
        value = base + value.slice(1)
      } else if (/^[\w-]+\.html(?:#.*)?$/.test(value) && slugs.has(value.split('.')[0])) {
        value = `${base}${value}`
      } else if (value.startsWith('/') && !value.startsWith('//')) {
        value = `https://www.cosmicpython.com${value}`
      }
      $(el).attr(attr, value)
    }
  })

  const translations = { ...dictionary, ...edits.translations }
  const words = {}
  const missing = new Map()
  let translated = 0
  let total = 0
  for (const node of textNodes($)) {
    if (!$(node).parents('body').length) continue
    for (const match of node.data.matchAll(wordPattern)) {
      const word = match[0]
      const key = normalize(word)
      total++
      const translation = translations[key]
      if (!translation) {
        missing.set(key, (missing.get(key) || 0) + 1)
        continue
      }
      words[key] = translation
      translated++
    }
  }
  const vocabulary = ' ' + [...$('body').text().matchAll(wordPattern)].map(match => normalize(match[0])).join(' ') + ' '
  const pagePhrases = Object.fromEntries(Object.entries({ ...phrases, ...edits.phrases }).filter(([phrase]) => vocabulary.includes(` ${phrase} `)))
  return { title, styles, html: $('body').html(), words, phrases: pagePhrases, contexts, translated, total, missing: Object.fromEntries(missing) }
}
