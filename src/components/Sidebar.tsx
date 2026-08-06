import { useRef } from 'react'
import { FolderOpen, Route } from 'lucide-react'
import type { ParsedTrajectory } from '../types'
import type { AnnotationIndex } from '../lib/annotations'
import { useI18n } from '../lib/i18n'

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
}: {
  data: ParsedTrajectory
  fileName?: string
  annotations: AnnotationIndex
  showTranslations: boolean
  onToggleTranslations: () => void
  onLoadAnnotations: (raw: string) => void
  onReset: () => void
}) {
  const { meta, stats } = data
  const annInputRef = useRef<HTMLInputElement>(null)
  const { t } = useI18n()

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="logo">
          <Route size={20} strokeWidth={2.2} />
        </span>
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
        <FolderOpen size={14} />
        {t('sidebar.openAnother')}
      </button>

      {meta.title && <div className="session-title">{meta.title}</div>}

      <section className="sidebar-section">
        <h3>{t('sidebar.session')}</h3>
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
        <h3>{t('sidebar.stats')}</h3>
        <div className="stat-grid">
          <div className="stat">
            <span className="stat-num">{fmtInt(stats.userMessages)}</span>
            <span className="stat-label">{t('stat.user')}</span>
          </div>
          <div className="stat">
            <span className="stat-num">{fmtInt(stats.assistantMessages)}</span>
            <span className="stat-label">{t('stat.assistant')}</span>
          </div>
          <div className="stat">
            <span className="stat-num">{fmtInt(stats.toolCalls)}</span>
            <span className="stat-label">{t('stat.toolCalls')}</span>
          </div>
          <div className="stat">
            <span className="stat-num">{fmtInt(stats.outputTokens)}</span>
            <span className="stat-label">{t('stat.outTokens')}</span>
          </div>
          <div className="stat">
            <span className="stat-num">{fmtInt(stats.inputTokens)}</span>
            <span className="stat-label">{t('stat.inTokens')}</span>
          </div>
          <div className="stat">
            <span className="stat-num">{fmtInt(stats.cacheReadTokens)}</span>
            <span className="stat-label">{t('stat.cacheRead')}</span>
          </div>
        </div>
      </section>

      <section className="sidebar-section">
        <h3>{t('sidebar.annotations')}</h3>
        {annotations.hasAny ? (
          <div className="ann-status">
            {annotations.targetLang && (
              <div className="ann-lang">🌐 {annotations.targetLang}</div>
            )}
            <div className="ann-counts">
              {t('sidebar.annCounts', {
                s: annotations.summaries.size,
                t: annotations.translations.size,
              })}
            </div>
            {annotations.translations.size > 0 && (
              <label className="ann-toggle">
                <input
                  type="checkbox"
                  checked={showTranslations}
                  onChange={onToggleTranslations}
                />
                {t('sidebar.showTranslations')}
              </label>
            )}
          </div>
        ) : (
          <p className="empty-note">{t('sidebar.noAnnotations')}</p>
        )}
        <button className="link-button" onClick={() => annInputRef.current?.click()}>
          {t('sidebar.loadAnnotations')}
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
        <p className="parse-warning">{t('sidebar.parseWarning', { n: data.parseErrors })}</p>
      )}
    </aside>
  )
}
