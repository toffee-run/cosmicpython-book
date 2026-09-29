# Sources

## Book and original presentation

Harry Percival and Bob Gregory, *Architecture Patterns with Python* (O’Reilly).

- Website: https://www.cosmicpython.com/
- HTML, images and custom CSS: https://github.com/cosmicpython/cosmicpython.github.io
- Snapshot commit: `729318bb663caf3a7bc739694108f3864b9eefab`
- Downloaded: 2026-09-29.
- Original HTML is retained in `content/book/`; the original license section in
  `preface.html` is preserved in the rendered site.
- The website repository's root license is copied verbatim to `UPSTREAM-LICENSE`.
  The book's own preface states **CC BY-NC-ND**, while the repository's root file
  states **CC BY-NC-SA 4.0**; this project does not change those source notices.

Changes in this reader: TanStack Start/React rendering, local resource URLs,
word-level Russian glosses, optional author notes/replacements, removal of the
original site's analytics and embedded Disqus scripts. The English text is
unchanged by default. This is an independent reader, not an official edition.

## Dictionary

`translations/dictionary.json` is a book-specific subset of the **English–Russian
FreeDict+WikDict dictionary, 2025.11.23** (62,181 headwords), maintained by Karl
Bartel. Source: Wiktionary via DBnary; bilingual extraction by WikDict/FreeDict.

- https://download.freedict.org/dictionaries/eng-rus/2025.11.23/
- https://www.wikdict.com/
- https://www.wiktionary.org/
- https://kaiko.getalp.org/about-dbnary/
- License: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/legalcode).

Changes: only vocabulary occurring in this book is included; first translation
selected, stress marks removed, common English suffixes resolved to dictionary
headwords. Wiktionary link markup has been removed. Technical and common-word
corrections and proper names live in `overrides.json`; phrase-sensitive glosses
live in `phrases.json`. Authors can also override individual passages.
The dictionary subset and these corrections are distributed under CC BY-SA 3.0.
These are lexical glosses, not a reviewed contextual translation of the book.

## Styles and fonts

- Asciidoctor default stylesheet: MIT, https://asciidoctor.org/stylesheets/asciidoctor.css
- Noto Sans / Noto Serif: SIL Open Font License 1.1, Google Fonts.
- Droid Sans Mono: Apache License 2.0, Google Fonts.
- Font Awesome 4.7: CSS under MIT; font under SIL OFL 1.1.
  https://fontawesome.com/v4/license/

Font and CSS files are stored locally under `public/`; reading and translating
does not contact a font provider or translation service.
