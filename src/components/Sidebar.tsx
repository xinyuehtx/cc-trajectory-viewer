import { useRef } from 'react'
import type { ParsedTrajectory } from '../types'
import type { AnnotationIndex } from '../lib/annotations'

function fmtInt(n: number): string {
  return n.toLocaleString()
}

function basename(p: string): string {
  return p.split('/').pop() || p
}

export default function Sidebar({
  data,
  fileName,
  annotations,
  showTranslations,
  onToggleTranslations,
  onLoadAnnotations,
  onReset,
  onOpenDiff,
}: {
  data: ParsedTrajectory
  fileName?: string
  annotations: AnnotationIndex
  showTranslations: boolean
  onToggleTranslations: () => void
  onLoadAnnotations: (raw: string) => void
  onReset: () => void
  onOpenDiff: (eventId: string) => void
}) {
  const { meta, stats, modifiedFiles } = data
  const annInputRef = useRef<HTMLInputElement>(null)

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="logo">◆</span>
        <div>
          <div className="brand-title">Trajectory Viewer</div>
          {fileName && (
            <div className="brand-file" title={fileName}>
              {basename(fileName)}
            </div>
          )}
        </div>
      </div>

      <button className="reset-button" onClick={onReset}>
        ← Open another file
      </button>

      {meta.title && <div className="session-title">{meta.title}</div>}

      <section className="sidebar-section">
        <h3>Session</h3>
        <dl className="meta-list">
          {meta.cwd && (
            <>
              <dt>cwd</dt>
              <dd title={meta.cwd}>{meta.cwd}</dd>
            </>
          )}
          {meta.gitBranch && (
            <>
              <dt>branch</dt>
              <dd>{meta.gitBranch}</dd>
            </>
          )}
          {meta.model && (
            <>
              <dt>model</dt>
              <dd>{meta.model}</dd>
            </>
          )}
          {meta.version && (
            <>
              <dt>version</dt>
              <dd>{meta.version}</dd>
            </>
          )}
          {meta.sessionId && (
            <>
              <dt>session</dt>
              <dd className="mono-small" title={meta.sessionId}>
                {meta.sessionId.slice(0, 8)}…
              </dd>
            </>
          )}
        </dl>
      </section>

      <section className="sidebar-section">
        <h3>Stats</h3>
        <div className="stat-grid">
          <div className="stat">
            <span className="stat-num">{fmtInt(stats.userMessages)}</span>
            <span className="stat-label">user</span>
          </div>
          <div className="stat">
            <span className="stat-num">{fmtInt(stats.assistantMessages)}</span>
            <span className="stat-label">assistant</span>
          </div>
          <div className="stat">
            <span className="stat-num">{fmtInt(stats.toolCalls)}</span>
            <span className="stat-label">tool calls</span>
          </div>
          <div className="stat">
            <span className="stat-num">{fmtInt(stats.outputTokens)}</span>
            <span className="stat-label">out tokens</span>
          </div>
          <div className="stat">
            <span className="stat-num">{fmtInt(stats.inputTokens)}</span>
            <span className="stat-label">in tokens</span>
          </div>
          <div className="stat">
            <span className="stat-num">{fmtInt(stats.cacheReadTokens)}</span>
            <span className="stat-label">cache read</span>
          </div>
        </div>
      </section>

      <section className="sidebar-section">
        <h3>
          Modified files{' '}
          {modifiedFiles.length > 0 && <span className="count">{modifiedFiles.length}</span>}
        </h3>
        {modifiedFiles.length === 0 ? (
          <p className="empty-note">No file edits in this session.</p>
        ) : (
          <ul className="file-list">
            {modifiedFiles.map((f) => (
              <li key={f.path}>
                <button
                  className="file-link"
                  onClick={() => onOpenDiff(f.firstEventId)}
                  title={f.path}
                >
                  <span className="file-name">{basename(f.path)}</span>
                  <span className="file-edits">{f.edits}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="sidebar-section">
        <h3>Annotations</h3>
        {annotations.hasAny ? (
          <div className="ann-status">
            {annotations.targetLang && (
              <div className="ann-lang">🌐 {annotations.targetLang}</div>
            )}
            <div className="ann-counts">
              {annotations.summaries.size} summaries · {annotations.translations.size} translations
            </div>
            {annotations.translations.size > 0 && (
              <label className="ann-toggle">
                <input
                  type="checkbox"
                  checked={showTranslations}
                  onChange={onToggleTranslations}
                />
                Show translations
              </label>
            )}
          </div>
        ) : (
          <p className="empty-note">
            No annotations loaded. Generate them with the <code>view-trajectory</code>{' '}
            skill, or load a <code>.cctv.json</code> file.
          </p>
        )}
        <button className="link-button" onClick={() => annInputRef.current?.click()}>
          Load annotations…
        </button>
        <input
          ref={annInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = () => onLoadAnnotations(String(reader.result ?? ''))
            reader.readAsText(file)
          }}
        />
      </section>

      {data.parseErrors > 0 && (
        <p className="parse-warning">⚠ {data.parseErrors} line(s) could not be parsed.</p>
      )}
    </aside>
  )
}
