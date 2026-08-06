import { useCallback, useRef, useState } from 'react'

export default function Uploader({
  onLoad,
  error,
}: {
  onLoad: (raw: string, fileName: string) => void
  error?: string
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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
        <span className="logo-big">◆</span>
        <h1>Claude Code Trajectory Viewer</h1>
        <p className="tagline">
          Drop a <code>.jsonl</code> session file to visualize the timeline, tool
          calls, and code diffs.
        </p>
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
          <div className="dropzone-icon">⬆</div>
          <div className="dropzone-text">
            <strong>Drop a trajectory here</strong>
            <span>or click to browse</span>
          </div>
        </div>
      </div>

      {error && <div className="upload-error">⚠ {error}</div>}

      <div className="uploader-hint">
        <p>
          Session files live under{' '}
          <code>~/.claude/projects/&lt;project&gt;/&lt;sessionId&gt;.jsonl</code>.
        </p>
        <p>
          From a terminal you can also run{' '}
          <code>npx @xinyuehtx/cc-trajectory-viewer path/to/session.jsonl</code>.
        </p>
      </div>
    </div>
  )
}
