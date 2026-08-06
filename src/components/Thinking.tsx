import { useState } from 'react'
import type { ThinkingEvent } from '../types'
import Markdown from './Markdown'

export default function Thinking({ event }: { event: ThinkingEvent }) {
  const [open, setOpen] = useState(false)
  const firstLine = event.text.trim().split('\n')[0].slice(0, 120)

  return (
    <div className="event thinking" id={event.id}>
      <button className="thinking-toggle" onClick={() => setOpen((v) => !v)}>
        <span className="thinking-caret">{open ? '▾' : '▸'}</span>
        <span className="thinking-label">💭 Thinking</span>
        {!open && <span className="thinking-preview">{firstLine}…</span>}
      </button>
      {open && (
        <div className="thinking-body">
          <Markdown text={event.text} />
        </div>
      )}
    </div>
  )
}
