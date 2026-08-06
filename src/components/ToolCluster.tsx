import { useState } from 'react'
import type { ToolCallEvent } from '../types'
import { useI18n } from '../lib/i18n'
import ToolCall from './ToolCall'

/** Distinct tool names in order of first appearance, for the header preview. */
function toolNamePreview(calls: ToolCallEvent[]): string {
  const seen: string[] = []
  for (const c of calls) if (!seen.includes(c.name)) seen.push(c.name)
  const shown = seen.slice(0, 4).join(', ')
  return seen.length > 4 ? `${shown}, +${seen.length - 4}` : shown
}

export default function ToolCluster({
  calls,
  summary,
}: {
  calls: ToolCallEvent[]
  /** optional agent-generated summary shown in the header */
  summary?: string
}) {
  // Collapse large clusters by default; keep short ones open for readability.
  const [open, setOpen] = useState(calls.length <= 2 && !summary)
  const { t } = useI18n()
  const anchorId = calls[0]?.id

  return (
    <div className="event tool-cluster" id={anchorId}>
      <button className="cluster-head" onClick={() => setOpen((v) => !v)}>
        <span className="cluster-caret">{open ? '▾' : '▸'}</span>
        <span className="cluster-badge">
          🔧 {t(calls.length === 1 ? 'cluster.calls' : 'cluster.calls_plural', { n: calls.length })}
        </span>
        {summary ? (
          <span className="cluster-summary" title={summary}>
            {summary}
          </span>
        ) : (
          <span className="cluster-tools">{toolNamePreview(calls)}</span>
        )}
      </button>
      {summary && open && <div className="cluster-summary-full">{summary}</div>}
      {open && (
        <div className="cluster-body">
          {calls.map((c) => (
            <ToolCall key={c.id} event={c} />
          ))}
        </div>
      )}
    </div>
  )
}
