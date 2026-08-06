import { useMemo } from 'react'
import hljs from 'highlight.js/lib/common'
import { buildFileDiff, toSplitRows, type DiffRow, type FileDiff } from '../lib/diff'

export type DiffMode = 'unified' | 'split'

function highlight(text: string, language?: string): string {
  if (!text) return ''
  try {
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(text, { language }).value
    }
  } catch {
    /* fall through */
  }
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function UnifiedRow({ row, language }: { row: DiffRow; language?: string }) {
  const sign = row.type === 'add' ? '+' : row.type === 'del' ? '-' : ' '
  return (
    <div className={`diff-row diff-${row.type}`}>
      <span className="diff-gutter">{row.oldNo ?? ''}</span>
      <span className="diff-gutter">{row.newNo ?? ''}</span>
      <span className="diff-sign">{sign}</span>
      <span
        className="diff-code"
        dangerouslySetInnerHTML={{ __html: highlight(row.text, language) }}
      />
    </div>
  )
}

function SplitCell({
  row,
  side,
  language,
}: {
  row?: DiffRow
  side: 'left' | 'right'
  language?: string
}) {
  if (!row) return <div className="diff-cell diff-empty" />
  // On the left we show deletions/context; on the right additions/context.
  const type = row.type === 'ctx' ? 'ctx' : side === 'left' ? 'del' : 'add'
  const no = side === 'left' ? row.oldNo : row.newNo
  return (
    <div className={`diff-cell diff-${type}`}>
      <span className="diff-gutter">{no ?? ''}</span>
      <span
        className="diff-code"
        dangerouslySetInnerHTML={{ __html: highlight(row.text, language) }}
      />
    </div>
  )
}

/** Renders just the diff body (rows) — reused by the timeline and Diffs tab. */
export function DiffBody({
  rows,
  language,
  mode,
}: {
  rows: DiffRow[]
  language?: string
  mode: DiffMode
}) {
  const split = useMemo(() => (mode === 'split' ? toSplitRows(rows) : null), [mode, rows])

  if (mode === 'split' && split) {
    return (
      <div className="diff-body diff-body-split">
        {split.map((r, i) => (
          <div className="diff-split-row" key={i}>
            <SplitCell row={r.left} side="left" language={language} />
            <SplitCell row={r.right} side="right" language={language} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="diff-body">
      {rows.map((row, i) => (
        <UnifiedRow key={i} row={row} language={language} />
      ))}
    </div>
  )
}

export default function DiffView({
  toolName,
  input,
  mode = 'unified',
  wrap = false,
  showHeader = true,
}: {
  toolName: string
  input: Record<string, unknown>
  mode?: DiffMode
  wrap?: boolean
  showHeader?: boolean
}) {
  const diff: FileDiff | null = useMemo(() => buildFileDiff(toolName, input), [toolName, input])
  if (!diff) return null

  return (
    <div className={`diff${wrap ? ' wrap' : ''}`}>
      {showHeader && (
        <div className="diff-header">
          <span className="diff-path" title={diff.filePath}>
            {diff.filePath || '(no path)'}
          </span>
          <span className="diff-meta">
            <span className="diff-label">{diff.label}</span>
            {diff.added > 0 && <span className="diff-added">+{diff.added}</span>}
            {diff.removed > 0 && <span className="diff-removed">−{diff.removed}</span>}
          </span>
        </div>
      )}
      <DiffBody rows={diff.rows} language={diff.language} mode={mode} />
    </div>
  )
}
