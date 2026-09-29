export type Phrases = Record<string, Record<string, string>>
export const wordPattern: RegExp
export function normalize(word: string): string
export function matchCase(source: string, translation: string): string
export function resolveTranslation(text: string, offset: number, word: string, words: Record<string, string>, phrases?: Phrases): string | undefined
