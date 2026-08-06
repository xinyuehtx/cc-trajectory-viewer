import { useEffect, useMemo, useRef } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js/lib/common'

marked.setOptions({
  gfm: true,
  breaks: false,
})

export default function Markdown({ text }: { text: string }) {
  const ref = useRef<HTMLDivElement>(null)

  const html = useMemo(() => {
    const rendered = marked.parse(text, { async: false }) as string
    return DOMPurify.sanitize(rendered, { ADD_ATTR: ['target'] })
  }, [text])

  // Highlight code blocks after the sanitized HTML is in the DOM. Doing this
  // post-render (rather than via a marked renderer override) keeps us decoupled
  // from marked's renderer API, which changes between major versions.
  useEffect(() => {
    const root = ref.current
    if (!root) return
    root.querySelectorAll<HTMLElement>('pre code').forEach((el) => {
      if (el.dataset.highlighted) return
      try {
        hljs.highlightElement(el)
      } catch {
        /* ignore highlight failures */
      }
    })
  }, [html])

  return (
    <div
      ref={ref}
      className="markdown"
      // Content is sanitized with DOMPurify above.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
