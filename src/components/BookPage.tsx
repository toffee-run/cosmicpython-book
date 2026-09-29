import { useEffect, useRef } from 'react'
import { installWordTranslation } from '../lib/word-translation'
import type { TranslationContext } from '../lib/word-translation'
import type { Phrases } from '../lib/translation.mjs'

interface Page { title: string; html: string; styles: string; words: Record<string, string>; phrases: Phrases; contexts: Record<string, TranslationContext> }

export function BookPage({ page }: { page: Page }) {
  const source = useRef<HTMLDivElement>(null)
  useEffect(() => installWordTranslation(source.current!, page.words, page.phrases, page.contexts), [page])
  return <>
    <style>{page.styles}</style>
    <div ref={source} className="book-source" dangerouslySetInnerHTML={{ __html: page.html }} />
  </>
}
