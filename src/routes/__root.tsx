import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router'
import readerCss from '../reader.css?url'
import { ThemeToggle, themeScript } from '../components/ThemeToggle'

const base = import.meta.env.BASE_URL
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      { title: 'Architecture Patterns with Python — чтение с переводом слов' },
      {
        name: 'description',
        content:
          'Читайте Cosmic Python об архитектуре Python-приложений, DDD и TDD. Русские переводы английских слов при наведении помогают изучать технический английский в контексте.',
      },
      {
        name: 'keywords',
        content:
          'Architecture Patterns with Python, Cosmic Python, Python architecture, архитектура Python, DDD, TDD, технический английский, английский для программистов',
      },
      { name: 'robots', content: 'index, follow' },
      { property: 'og:type', content: 'website' },
      {
        property: 'og:title',
        content: 'Architecture Patterns with Python — чтение с переводом слов',
      },
      {
        property: 'og:description',
        content:
          'Изучайте архитектуру Python-приложений и технический английский: русские переводы слов показываются прямо в тексте.',
      },
      { property: 'og:locale', content: 'ru_RU' },
    ],
    links: [
      { rel: 'icon', href: `${base}favicon.ico` },
      { rel: 'stylesheet', href: `${base}vendor/fonts.css` },
      { rel: 'stylesheet', href: `${base}vendor/asciidoctor.css` },
      { rel: 'stylesheet', href: `${base}vendor/font-awesome.min.css` },
      { rel: 'stylesheet', href: readerCss },
    ],
  }),
  component: () => (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /><HeadContent /></head>
      <body className="article toc2 toc-left"><Outlet /><ThemeToggle /><Scripts /></body>
    </html>
  ),
  notFoundComponent: () => <main id="content"><h1>Страница не найдена</h1><p><a href={base}>Вернуться к книге</a></p></main>,
})
