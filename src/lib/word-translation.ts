import { normalize, resolveTranslation, wordPattern } from './translation.mjs'
import type { Phrases } from './translation.mjs'

const excluded = 'pre, code, kbd, samp, script, style, noscript, svg, math, textarea, .image-source, [data-no-translate]'
const blocks = 'p, li, h1, h2, h3, h4, h5, h6, dt, dd, td, th, figcaption, .title, .footnote, #toctitle'
export interface TranslationContext { translations?: Record<string, string>; phrases?: Phrases }
type CaretDocument = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  caretRangeFromPoint?: (x: number, y: number) => Range | null
}

/** Original text nodes are untouched until hover. Only one temporary inline replacement. */
export function installWordTranslation(root: HTMLElement, words: Record<string, string>, phrases: Phrases, contexts: Record<string, TranslationContext>) {
  let active: { element: HTMLSpanElement; original: string; trigger: DOMRect; scroll: { node: Element; x: number; y: number }[]; windowX: number; windowY: number } | null = null
  let frame = 0
  const doc = root.ownerDocument as CaretDocument
  const contains = (rect: DOMRect, x: number, y: number) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

  function clear() {
    if (!active) return
    const { element, original } = active
    active = null
    const parent = element.parentNode
    element.replaceWith(doc.createTextNode(original))
    parent?.normalize()
  }

  function show(x: number, y: number, touch = false) {
    if (active && contains(active.trigger, x, y)) return
    clear()
    const caret = doc.caretPositionFromPoint?.(x, y)
    const legacy = !caret ? doc.caretRangeFromPoint?.(x, y) : null
    const node = caret?.offsetNode ?? legacy?.startContainer
    const offset = caret?.offset ?? legacy?.startOffset
    if (!node || offset === undefined || node.nodeType !== Node.TEXT_NODE || !root.contains(node)) return
    const parent = node.parentElement
    if (!parent || parent.closest(excluded)) return
    for (const match of (node.textContent || '').matchAll(wordPattern)) {
      if (offset < match.index || offset > match.index + match[0].length) continue
      const range = doc.createRange()
      range.setStart(node, match.index)
      range.setEnd(node, match.index + match[0].length)
      const rect = Array.from(range.getClientRects()).find(rect => contains(rect, x, y))
      if (!rect) return
      const passage = parent.closest(blocks) || parent
      const prefix = doc.createRange()
      prefix.selectNodeContents(passage)
      prefix.setEnd(node, match.index)
      const local = contexts[parent.closest('[data-translation-context]')?.getAttribute('data-translation-context') || '']
      const glossary = { ...words, ...local?.translations }
      // Explicit passage overrides take precedence over general phrase rules.
      const scopedPhrases = { ...phrases, ...local?.phrases }
      const key = normalize(match[0])
      const translation = local?.translations?.[key]
        ? resolveTranslation(match[0], 0, match[0], glossary)
        : resolveTranslation(passage.textContent || '', prefix.toString().length, match[0], glossary, scopedPhrases)
      if (!translation) return
      const element = doc.createElement('span')
      element.className = 'word-translation'
      element.lang = 'ru'
      element.dataset.original = match[0]
      if (!touch) {
        // The original hit area stays empty, including room for a visible cursor.
        // Both the spacer and translation participate in line layout.
        const spacer = doc.createElement('span')
        spacer.className = 'translation-cursor-space'
        spacer.setAttribute('aria-hidden', 'true')
        spacer.style.width = `${rect.width + 24}px`
        element.append(spacer)
      }
      const text = doc.createElement('span')
      text.className = 'translation-text'
      text.textContent = translation
      element.append(text)
      range.deleteContents()
      range.insertNode(element)
      if (!touch) {
        const cursorOverlaps = () => {
          const translated = doc.createRange()
          translated.selectNodeContents(text)
          return Array.from(translated.getClientRects()).some(box =>
            box.left < x + 24 && box.right > x - 2 && box.top < y + 24 && box.bottom > y - 4)
        }
        const spacer = element.querySelector<HTMLElement>('.translation-cursor-space')!
        // Floats and right-aligned text expand to the left: reserve space after
        // the translation there, instead of assuming a left-aligned paragraph.
        const wider = Math.min(window.innerWidth - 32, rect.width + text.getBoundingClientRect().width + 48)
        for (const [side, width] of [['after', rect.width + 24], ['before', wider], ['after', wider]] as const) {
          if (!cursorOverlaps()) break
          spacer.style.width = `${width}px`
          if (side === 'before') element.prepend(spacer)
          else element.append(spacer)
        }
        if (cursorOverlaps()) {
          // On a narrow line neither horizontal position may be clear. Put the
          // translation below the pointer using real line breaks, never an overlay.
          element.prepend(spacer)
          spacer.style.width = `${rect.width}px`
          for (let i = 0; i < 4 && cursorOverlaps(); i++) text.before(doc.createElement('br'))
        }
      }
      const scroll = []
      for (let node: Element | null = parent; node; node = node.parentElement) scroll.push({ node, x: node.scrollLeft, y: node.scrollTop })
      active = { element, original: match[0], trigger: rect, scroll, windowX: window.scrollX, windowY: window.scrollY }
      return
    }
  }

  function move(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return
    if (event.buttons) {
      if (!(event.target as Element).closest('a[href]')) dismiss()
      return
    }
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => show(event.clientX, event.clientY))
  }
  function tap(event: PointerEvent) {
    if (event.pointerType === 'mouse') {
      // Restoring a hovered link on pointerdown can move it before the native click.
      if (!(event.target as Element).closest('a[href]')) dismiss()
      return
    }
    const target = event.target as Node
    if (active && (contains(active.trigger, event.clientX, event.clientY) || active.element.contains(target))) clear()
    else show(event.clientX, event.clientY, true)
  }
  function dismiss() { cancelAnimationFrame(frame); clear() }
  function scrolled() {
    // A queued scroll event from before hover must not remove a new translation.
    if (active && (window.scrollX !== active.windowX || window.scrollY !== active.windowY || active.scroll.some(({ node, x, y }) => node.scrollLeft !== x || node.scrollTop !== y))) dismiss()
  }
  function leave(event: PointerEvent) { if (event.pointerType === 'mouse') dismiss() }
  function key(event: KeyboardEvent) { if (event.key === 'Escape') dismiss() }
  // Inline reflow may move the link away from the hit point. Track real pointer
  // movement on the document, not synthetic leave events caused by that reflow.
  doc.addEventListener('pointermove', move)
  root.addEventListener('pointerdown', tap)
  doc.documentElement.addEventListener('pointerleave', leave)
  window.addEventListener('scroll', scrolled, true)
  window.addEventListener('resize', dismiss)
  window.addEventListener('blur', dismiss)
  window.addEventListener('beforeprint', dismiss)
  doc.addEventListener('keydown', key)
  root.dataset.translationReady = 'true'
  return () => {
    dismiss()
    delete root.dataset.translationReady
    doc.removeEventListener('pointermove', move)
    root.removeEventListener('pointerdown', tap)
    doc.documentElement.removeEventListener('pointerleave', leave)
    window.removeEventListener('scroll', scrolled, true)
    window.removeEventListener('resize', dismiss)
    window.removeEventListener('blur', dismiss)
    window.removeEventListener('beforeprint', dismiss)
    doc.removeEventListener('keydown', key)
  }
}
