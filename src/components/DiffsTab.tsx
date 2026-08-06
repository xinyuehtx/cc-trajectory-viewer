import type { ToolCallEvent } from '../types'
import DiffView, { type DiffMode } from './DiffView'

export default function DiffsTab({
  edits,
  mode,
  onModeChange,
}: {
  edits: ToolCallEvent[]
  mode: DiffMode
  onModeChange: (m: DiffMode) => void
}) {
  if (edits.length === 0) {
    return (
      <div className="diffs-empty">
        <p>No file edits in this session.</p>
      </div>
    )
  }

  return (
    <div className="diffs-tab">
      <div className="diffs-toolbar">
        <span className="diffs-count">
          {edits.length} change{edits.length === 1 ? '' : 's'}
        </span>
        <div className="mode-toggle" role="tablist" aria-label="Diff view mode">
          <button
            className={mode === 'unified' ? 'active' : ''}
            onClick={() => onModeChange('unified')}
          >
            ▤ Unified
          </button>
          <button
            className={mode === 'split' ? 'active' : ''}
            onClick={() => onModeChange('split')}
          >
            ▥ Split
          </button>
        </div>
      </div>

      <div className="diffs-list">
        {edits.map((e, i) => (
          <div className="diff-card" id={`diff-${e.id}`} key={e.id}>
            <div className="diff-card-index">#{i + 1}</div>
            <DiffView toolName={e.name} input={e.input} mode={mode} />
          </div>
        ))}
      </div>
    </div>
  )
}
