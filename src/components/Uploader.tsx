import { useCallback, useRef, useState } from 'react'
import { GitCompare, ListTree, Palette, Route, UploadCloud } from 'lucide-react'
import { useI18n } from '../lib/i18n'

const SISTER_URL = 'https://github.com/xinyuehtx/harbor-trajectory-viewer'
const HARBOR_URL = 'https://github.com/harbor-framework/harbor'
// Relative path resolves correctly under both the localhost root and the
// GitHub Pages project sub-path (build uses base: './').
const shot = (name: string) => `screenshots/${name}`

export default function Uploader({
  onLoad,
  error,
}: {
  onLoad: (raw: string, fileName: string) => void
  error?: string
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useI18n()

  const readFile = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => onLoad(String(reader.result ?? ''), file.name)
      reader.readAsText(file)
    },
    [onLoad],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) readFile(file)
    },
    [readFile],
  )

  return (
    <div className="uploader-screen">
      <div className="uploader-hero">
        <span className="logo-big">
          <Route size={44} strokeWidth={2} />
        </span>
        <h1>{t('uploader.title')}</h1>
        <p className="tagline">{t('uploader.tagline')}</p>
      </div>

      <div
        className={`dropzone${dragging ? ' dropzone-active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jsonl,.json,application/json,text/plain"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) readFile(file)
          }}
        />
        <div className="dropzone-inner">
          <div className="dropzone-icon">
            <UploadCloud size={30} />
          </div>
          <div className="dropzone-text">
            <strong>{t('uploader.drop')}</strong>
            <span>{t('uploader.browse')}</span>
          </div>
        </div>
      </div>

      {error && <div className="upload-error">⚠ {error}</div>}

      <ul className="uploader-features">
        <li>
          <ListTree size={16} />
          {t('uploader.feat1')}
        </li>
        <li>
          <GitCompare size={16} />
          {t('uploader.feat2')}
        </li>
        <li>
          <Palette size={16} />
          {t('uploader.feat3')}
        </li>
      </ul>

      <div className="uploader-shots">
        <img src={shot('timeline-dark.png')} alt={t('uploader.demoAlt')} loading="lazy" />
        <img src={shot('diffs-dark.png')} alt={t('uploader.demoAlt')} loading="lazy" />
      </div>

      <div className="uploader-hint">
        <p>{t('uploader.hintLocation')}</p>
        <p>
          {t('uploader.hintCli')}{' '}
          <code>npx @xinyuehtx/cc-trajectory-viewer path/to/session.jsonl</code>.
        </p>
        <p className="uploader-sister">
          🔗 {t('uploader.sister')}:{' '}
          <a href={SISTER_URL} target="_blank" rel="noreferrer noopener">
            Harbor Trajectory Viewer
          </a>{' '}
          — {t('uploader.sisterDesc')} (
          <a href={HARBOR_URL} target="_blank" rel="noreferrer noopener">
            {t('uploader.harborAbout')}
          </a>
          )
        </p>
      </div>
    </div>
  )
}
