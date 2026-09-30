import { createFileRoute } from '@tanstack/react-router'
import { BookPage } from '../components/BookPage'
import page from '../generated/preface.json'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ title: 'Preface — Architecture Patterns with Python | Cosmic Python' }],
  }),
  component: () => <BookPage page={page} />,
})
