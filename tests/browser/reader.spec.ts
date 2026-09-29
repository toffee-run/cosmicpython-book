import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { load } from 'cheerio'
import type { Page } from '@playwright/test'

async function wordPoint(page: Page, selector: string, word: string) {
  await expect(page.locator('.book-source')).toHaveAttribute('data-translation-ready', 'true')
  const element = page.locator(selector).first()
  await element.scrollIntoViewIfNeeded()
  return element.evaluate((el, word) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const start = node.textContent!.indexOf(word)
      if (start < 0) continue
      const range = document.createRange()
      range.setStart(node, start)
      range.setEnd(node, start + word.length)
      const rect = range.getBoundingClientRect()
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
    }
    throw new Error(`Word ${word} not found`)
  }, word)
}

test('static chapter hydrates without errors, all resources are local', async ({ page, baseURL }) => {
  const errors: string[] = []
  const requests: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('requestfailed', request => errors.push(request.url()))
  page.on('request', request => requests.push(request.url()))
  await page.goto('chapter_01_domain_model.html')
  await expect(page.locator('#content h2').first()).toContainText('Domain Modeling')
  await page.waitForLoadState('networkidle')
  expect(errors).toEqual([])
  expect(requests.every(url => url.startsWith(new URL(baseURL!).origin))).toBe(true)
  expect(await page.locator('img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true)
})

test('inline replacement moves neighbours, respects case and leaves room for the visible cursor', async ({ page }) => {
  await page.goto('chapter_01_domain_model.html')
  const heading = page.locator('#content h2').first()
  const overlay = page.locator('.word-translation')
  await page.mouse.move(0, 0)
  const original = await heading.textContent()
  const neighbourBefore = await wordPoint(page, '#content h2', 'Modeling')
  const point = await wordPoint(page, '#content h2', 'Domain')
  await page.mouse.move(point.x, point.y)
  await expect(overlay).toBeVisible()
  await expect(overlay).toHaveText('Предметной области')
  const neighbourAfter = await wordPoint(page, '#content h2', 'Modeling')
  expect(neighbourAfter.x > neighbourBefore.x || neighbourAfter.y > neighbourBefore.y).toBe(true)
  const translationRect = await page.locator('.translation-text').boundingBox()
  expect(translationRect!.x).toBeGreaterThan(point.x + 20)
  expect(await heading.evaluate(el => getComputedStyle(el).cursor)).not.toBe('none')
  expect(await overlay.evaluate(el => getComputedStyle(el).position)).toBe('static')
  await page.mouse.move(0, 0)
  await expect(overlay).toBeHidden()
  await expect(heading).toHaveText(original!)
  const code = await wordPoint(page, 'pre:visible', 'def')
  await page.mouse.move(code.x, code.y)
  await expect(overlay).toBeHidden()
})

for (const width of [1440, 390]) {
  test(`before hover matches original chapter pixels at ${width}px`, async ({ page, baseURL }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('chapter_01_domain_model.html')
    await page.mouse.move(0, 0)
    // The requested theme control is new; compare the book itself with the source.
    await page.addStyleTag({ content: '.theme-toggle { visibility: hidden !important; }' })
    await page.evaluate(() => document.fonts.ready)
    const actual = await page.screenshot({ path: testInfo.outputPath('actual.png') })
    const source = await readFile('content/book/chapter_01_domain_model.html', 'utf8')
    const $ = load(source)
    $('script, noscript, #disqus_thread, head link').remove()
    $('head style').each((_, el) => { $(el).text($(el).text().replace(/@import[^;]+;/g, '')) })
    $('head').prepend(`<link rel="stylesheet" href="${baseURL}vendor/fonts.css"><link rel="stylesheet" href="${baseURL}vendor/asciidoctor.css"><link rel="stylesheet" href="${baseURL}vendor/font-awesome.min.css">`)
    $('img').each((_, el) => {
      const src = $(el).attr('src')!
      $(el).attr('src', src.startsWith('/') ? baseURL + src.slice(1) : `${baseURL}${src}`)
    })
    await page.setContent($.html())
    await page.evaluate(() => document.fonts.ready)
    const expected = await page.screenshot({ path: testInfo.outputPath('original.png') })
    expect(actual.equals(expected), 'Original source and generated page must render identical pixels before hover').toBe(true)
  })
}

test('navigation and fragment links work on a plain static server', async ({ page }) => {
  await page.goto('./')
  await page.locator('#toc a[href$="chapter_01_domain_model.html"]').click()
  await expect(page).toHaveURL(/chapter_01_domain_model\.html$/)
  await page.locator('.next_chapter_link').click()
  await expect(page).toHaveURL(/chapter_02_repository\.html$/)
  await page.reload()
  await expect(page.locator('#content h2').first()).toContainText('Repository')
})

test('book and navigation work with JavaScript disabled', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(`${baseURL}preface.html`)
  await expect(page.locator('#toc a')).toHaveCount(23)
  await page.locator('#toc a[href$="chapter_01_domain_model.html"]').click()
  await expect(page.locator('#content h2').first()).toContainText('Domain Modeling')
  await context.close()
})

test('touch toggles one translation at a time', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } })
  const page = await context.newPage()
  await page.goto(`${baseURL}chapter_01_domain_model.html`)
  const point = await wordPoint(page, '#content h2', 'Domain')
  const overlay = page.locator('.word-translation')
  await page.touchscreen.tap(point.x, point.y)
  await expect(overlay).toHaveText('Предметной области')
  await expect(overlay).toBeVisible()
  await page.touchscreen.tap(point.x, point.y)
  await expect(overlay).toBeHidden()
  await context.close()
})

test('dark theme persists across navigation and styles prose, code and the table of contents', async ({ page }) => {
  await page.goto('chapter_01_domain_model.html')
  await page.getByRole('button', { name: 'Включить тёмную тему' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(23, 27, 33)')
  await expect(page.locator('#toc')).toHaveCSS('background-color', 'rgb(34, 40, 49)')
  await expect(page.locator('pre:visible').first()).toHaveCSS('background-color', 'rgb(32, 38, 46)')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.locator('#toc a[href$="chapter_02_repository.html"]').click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Включить светлую тему' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('system dark theme is used before a manual choice', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('chapter_01_domain_model.html')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('context survives nested emphasis and can distinguish repeated words', async ({ page }) => {
  await page.goto('chapter_06_uow.html')
  await page.locator('#content h2').evaluate(el => { el.innerHTML = 'In <em>order</em> to allocate an order.' })
  const point = await wordPoint(page, '#content h2', 'order')
  await page.mouse.move(point.x, point.y)
  await expect(page.locator('.translation-text')).toHaveText('того')
  await page.mouse.move(0, 0)
  const last = await page.locator('#content h2').evaluate(el => {
    const node = el.lastChild!; const start = node.textContent!.lastIndexOf('order')
    const range = document.createRange(); range.setStart(node, start); range.setEnd(node, start + 5)
    const rect = range.getBoundingClientRect(); return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
  })
  await page.mouse.move(last.x, last.y)
  await expect(page.locator('.translation-text')).toHaveText('заказ')
})

test('long inline translation wraps without overlapping its neighbour or cursor', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('chapter_01_domain_model.html')
  const point = await wordPoint(page, '#content h2', 'Domain')
  await page.mouse.move(point.x, point.y)
  await expect(page.locator('.translation-text')).toHaveText('Предметной области')
  const result = await page.locator('#content h2').evaluate((el, point) => {
    const translated = el.querySelector('.translation-text')!
    const range = document.createRange(); range.selectNodeContents(translated)
    const boxes = Array.from(range.getClientRects())
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    let neighbour: DOMRect | undefined
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const start = node.textContent!.indexOf('Modeling')
      if (start < 0) continue
      range.setStart(node, start); range.setEnd(node, start + 8)
      neighbour = range.getBoundingClientRect(); break
    }
    return {
      overlaps: boxes.some(box => neighbour && box.left < neighbour.right && box.right > neighbour.left && box.top < neighbour.bottom && box.bottom > neighbour.top),
      underCursor: boxes.some(box => point.x >= box.left && point.x <= box.right && point.y >= box.top && point.y <= box.bottom),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    }
  }, point)
  expect(result).toEqual({ overlaps: false, underCursor: false, overflow: false })
  await page.screenshot({ path: testInfo.outputPath('inline-mobile.png') })
  await page.keyboard.press('Escape')
  await expect(page.locator('.word-translation')).toHaveCount(0)
})

test('cursor stays clear of translations in right-aligned navigation links', async ({ page }) => {
  await page.goto('chapter_01_domain_model.html')
  const point = await wordPoint(page, '.next_chapter_link', 'Pattern')
  await page.mouse.move(point.x, point.y)
  await expect(page.locator('.translation-text')).toHaveText('Паттерн')
  const overlaps = await page.locator('.translation-text').evaluate((el, point) => {
    const range = document.createRange(); range.selectNodeContents(el)
    return Array.from(range.getClientRects()).some(box => box.left < point.x + 24 && box.right > point.x - 2 && box.top < point.y + 24 && box.bottom > point.y - 4)
  }, point)
  expect(overlaps).toBe(false)
  await page.mouse.click(point.x, point.y)
  await expect(page).toHaveURL(/chapter_02_repository\.html$/)
})
