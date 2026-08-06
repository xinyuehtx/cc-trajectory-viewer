import { useState } from 'react'
import type { ToolCallEvent } from '../types'
import { EDIT_TOOLS } from '../lib/parser'
import { buildFileDiff } from '../lib/diff'
import { useI18n } from '../lib/i18n'
import { useNav } from '../nav'
import ToolResult from './ToolResult'

/** A compact one-line summary of a tool's most relevant input argument. */
function summarize(name: string, input: Record<string, unknown>): string {
  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  switch (name) {
    case 'Bash':
      return s(input.command)
    case 'Read':
    case 'Edit':
    case 'MultiEdit':
    case 'Write':
    case 'NotebookEdit':
      return s(input.file_path) || s(input.notebook_path) || s(input.path)
    case 'Grep':
      return s(input.pattern) + (input.path ? `  in ${s(input.path)}` : '')
    case 'Glob':
      return s(input.pattern)
    case 'Task':
    case 'Agent':
      return s(input.description) || s(input.subagent_type)
    case 'WebFetch':
      return s(input.url)
    case 'WebSearch':
      return s(input.query)
    default: {
      const keys = Object.keys(input)
      if (keys.length === 0) return ''
      const first = input[keys[0]]
      return typeof first === 'string' ? first : keys.join(', ')
    }
  }
}

function InputBlock({ input }: { input: Record<string, unknown> }) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  const json = JSON.stringify(input, null, 2)
  if (json === '{}') return null
  return (
    <div className="tool-input">
      <button className="link-button" onClick={() => setOpen((v) => !v)}>
        {open ? t('tool.hideInput') : t('tool.showInput')}
      </button>
      {open && <pre className="tool-input-body">{json}</pre>}
    </div>
  )
}

export default function ToolCall({ event }: { event: ToolCallEvent }) {
  const nav = useNav()
  const { t } = useI18n()
  const isEdit = EDIT_TOOLS.has(event.name)
  const summary = summarize(event.name, event.input)
  const diff = isEdit ? buildFileDiff(event.name, event.input) : null

  return (
    <div className="tool-call" id={event.id}>
      <div className="tool-head">
        <span className="tool-badge">🔧 {event.name}</span>
        {summary && (
          <code className="tool-summary" title={summary}>
            {summary}
          </code>
        )}
        {diff && (
          <span className="tool-diffstat">
            {diff.added > 0 && <span className="diff-added">+{diff.added}</span>}
            {diff.removed > 0 && <span className="diff-removed">−{diff.removed}</span>}
            <button className="link-button" onClick={() => nav.openDiff(event.id)}>
              {t('tool.viewDiff')}
            </button>
          </span>
        )}
      </div>

      {!isEdit && <InputBlock input={event.input} />}

      {event.result && <ToolResult result={event.result} />}
    </div>
  )
}
