import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { matchCase, resolveTranslation } from '../src/lib/translation.mjs'

test('capitalization follows the original, including acronyms and single letters', () => {
  assert.equal(matchCase('domain', 'предметная область'), 'предметная область')
  assert.equal(matchCase('Domain', 'предметная область'), 'Предметная область')
  assert.equal(matchCase('DOMAIN', 'предметная область'), 'ПРЕДМЕТНАЯ ОБЛАСТЬ')
  assert.equal(matchCase('API', 'интерфейс программирования'), 'ИНТЕРФЕЙС ПРОГРАММИРОВАНИЯ')
  assert.equal(matchCase('A', 'некий'), 'Некий')
  assert.equal(matchCase('I', 'я'), 'Я')
})

test('phrases distinguish two senses of the same word within a single sentence', async () => {
  const phrases = JSON.parse(await readFile('content/translations/phrases.json', 'utf8'))
  const text = 'In order to allocate an order, set the state to a set of values.'
  const words = { order: 'заказ', set: 'множество' }
  assert.equal(resolveTranslation(text, text.indexOf('order'), 'order', words, phrases), 'того')
  assert.equal(resolveTranslation(text, text.lastIndexOf('order'), 'order', words, phrases), 'заказ')
  assert.equal(resolveTranslation(text, text.indexOf('set'), 'set', words, phrases), 'установить')
  assert.equal(resolveTranslation(text, text.lastIndexOf('set'), 'set', words, phrases), 'набор')
  assert.equal(resolveTranslation('in. order to', 4, 'order', words, phrases), 'заказ')
})

test('all context rules refer to words actually present in their phrases', async () => {
  const phrases = JSON.parse(await readFile('content/translations/phrases.json', 'utf8'))
  for (const [phrase, words] of Object.entries(phrases)) {
    assert.equal(phrase, phrase.toLowerCase())
    for (const [word, translation] of Object.entries(words)) {
      assert.ok(phrase.split(' ').includes(word), `${word} is not in ${phrase}`)
      assert.ok(translation.trim())
    }
  }
})
