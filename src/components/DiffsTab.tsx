import type { FileHistory, FileVersion } from '../lib/diff'
import { useI18n } from '../lib/i18n'
import { DiffBody, type DiffMode } from './DiffView'

function VersionBlock({
  history,
  version,
  showVersion,
  mode,
  wrap,
}: {
  history: FileHistory
  version: FileVersion
  showVersion: boolean
  mode: DiffMode
  wrap: boolean
}) {
  const { t } = useI18n()
  return (
    <div className={`diff${wrap ? ' wrap' : ''}`} id={`diff-${version.firstEventId}`}>
      <div className="diff-header">
        <span className="diff-path" title={history.path}>
          {history.path || '(no path)'}
        </span>
        <span className="diff-meta">
          {showVersion && (
            <span className={`diff-version-badge${version.external ? ' external' : ''}`}>
              {t('diffs.version', { n: version.index + 1 })}
            </span>
          )}
          {version.external && (
            <span className="diff-external-note">{t('diffs.externalChange')}</span>
          )}
          {version.added > 0 && <span className="diff-added">+{version.added}</span>}
          {version.removed > 0 && <span className="diff-removed">−{version.removed}</span>}
        </span>
      </div>
      <DiffBody rows={version.rows} language={history.language} mode={mode} />
    </div>
  )
}

export default function DiffsTab({
  histories,
  editCount,
  mode,
  onModeChange,
  wrap,
  onWrapChange,
}: {
  histories: FileHistory[]
  editCount: number
  mode: DiffMode
  onModeChange: (m: DiffMode) => void
  wrap: boolean
  onWrapChange: (w: boolean) => void
}) {
  const { t } = useI18n()

  if (histories.length === 0) {
    return (
      <div className="diffs-empty">
        <p>{t('diffs.noEdits')}</p>
      </div>
    )
  }

  const changesKey = editCount === 1 ? 'diffs.changes' : 'diffs.changes_plural'

  return (
    <div className="diffs-tab">
      <div className="diffs-toolbar">
        <span className="diffs-count">{t(changesKey, { n: editCount })}</span>
        <div className="diffs-toolbar-controls">
          <label className="wrap-toggle">
            <input
              type="checkbox"
              checked={wrap}
              onChange={(e) => onWrapChange(e.target.checked)}
            />
            {t('diffs.wrap')}
          </label>
          <div className="mode-toggle" role="tablist" aria-label="Diff view mode">
            <button
              className={mode === 'unified' ? 'active' : ''}
              onClick={() => onModeChange('unified')}
            >
              ▤ {t('diffs.unified')}
            </button>
            <button
              className={mode === 'split' ? 'active' : ''}
              onClick={() => onModeChange('split')}
            >
              ▥ {t('diffs.split')}
            </button>
          </div>
        </div>
      </div>

      <div className="diffs-list">
        {histories.map((h) => (
          <div className="diff-card diff-file" key={h.path}>
            <div className="diff-file-versions">
              {h.versions.map((v) => (
                <VersionBlock
                  key={v.firstEventId}
                  history={h}
                  version={v}
                  showVersion={h.versions.length > 1}
                  mode={mode}
                  wrap={wrap}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
