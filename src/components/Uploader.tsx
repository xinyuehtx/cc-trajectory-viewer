import { useCallback, useRef, useState } from 'react'
import { Route, UploadCloud } from 'lucide-react'
import { useI18n } from '../lib/i18n'

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

      <div className="uploader-hint">
        <p>{t('uploader.hintLocation')}</p>
        <p>
          {t('uploader.hintCli')}{' '}
          <code>npx @xinyuehtx/cc-trajectory-viewer path/to/session.jsonl</code>.
        </p>
      </div>
    </div>
  )
}
