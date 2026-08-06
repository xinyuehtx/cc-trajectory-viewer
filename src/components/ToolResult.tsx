import { useState } from 'react'
import type { ToolResult as ToolResultType } from '../types'

const PREVIEW_CHARS = 1600

export default function ToolResult({ result }: { result: ToolResultType }) {
  const [expanded, setExpanded] = useState(false)
  const text = result.content ?? ''
  const long = text.length > PREVIEW_CHARS
  const shown = expanded || !long ? text : text.slice(0, PREVIEW_CHARS)

  return (
    <div className={`tool-result${result.isError ? ' tool-result-error' : ''}`}>
      <div className="tool-result-head">
        <span className="tool-result-label">
          {result.isError ? '✗ error' : '↳ result'}
        </span>
        {result.images > 0 && (
          <span className="tool-result-images">🖼 {result.images} image(s)</span>
        )}
      </div>
      {text && (
        <pre className="tool-result-body">
          {shown}
          {long && !expanded ? '…' : ''}
        </pre>
      )}
      {long && (
        <button className="link-button" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show less' : `Show ${text.length - PREVIEW_CHARS} more chars`}
        </button>
      )}
    </div>
  )
}
