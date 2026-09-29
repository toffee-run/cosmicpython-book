export const wordPattern = /\p{Script=Latin}+(?:[’']\p{Script=Latin}+)*/gu
export const normalize = (word) => word.toLowerCase().replaceAll('’', "'")

export function matchCase(source, translation) {
  const letters = source.replace(/[^\p{L}]/gu, '')
  if (letters.length > 1 && letters === letters.toUpperCase()) return translation.toLocaleUpperCase('ru')
  const capital = letters[0] === letters[0]?.toUpperCase()
  return translation.replace(/\p{L}/u, letter => capital ? letter.toLocaleUpperCase('ru') : letter.toLocaleLowerCase('ru'))
}

/** Longest phrase wins; offsets distinguish two senses of a word in one paragraph. */
export function resolveTranslation(text, offset, word, words, phrases = {}) {
  const key = normalize(word)
  const tokens = [...text.matchAll(wordPattern)]
  const focus = tokens.findIndex(token => token.index === offset)
  if (focus >= 0) {
    const candidates = Object.entries(phrases).sort(([a], [b]) => b.length - a.length)
    for (const [phrase, translations] of candidates) {
      if (!translations[key]) continue
      const parts = phrase.split(' ')
      for (let pos = 0; pos < parts.length; pos++) {
        if (parts[pos] !== key) continue
        const start = focus - pos
        if (start < 0 || start + parts.length > tokens.length) continue
        if (!parts.every((part, i) => normalize(tokens[start + i][0]) === part)) continue
        // Never match a phrase across punctuation/sentence boundaries.
        const sequence = tokens.slice(start, start + parts.length)
        if (!sequence.slice(1).every((token, i) => /^[\s\-–]+$/.test(text.slice(sequence[i].index + sequence[i][0].length, token.index)))) continue
        return matchCase(word, translations[key])
      }
    }
  }
  return words[key] ? matchCase(word, words[key]) : undefined
}
