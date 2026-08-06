import { useState } from 'react'
import { Brain, ChevronDown, ChevronRight } from 'lucide-react'
import type { ThinkingEvent } from '../types'
import { useI18n } from '../lib/i18n'
import Markdown from './Markdown'

export default function Thinking({ event }: { event: ThinkingEvent }) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  const firstLine = event.text.trim().split('\n')[0].slice(0, 120)

  return (
    <div className="event thinking" id={event.id}>
      <button className="thinking-toggle" onClick={() => setOpen((v) => !v)}>
        <span className="thinking-caret">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
        <span className="thinking-label">
          <Brain size={14} />
          {t('thinking.label')}
        </span>
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
