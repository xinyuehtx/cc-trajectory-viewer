import { useState } from 'react'
import { CornerDownRight, ImageIcon, XCircle } from 'lucide-react'
import type { ToolResult as ToolResultType } from '../types'
import { useI18n } from '../lib/i18n'

const PREVIEW_CHARS = 1600

export default function ToolResult({ result }: { result: ToolResultType }) {
  const [expanded, setExpanded] = useState(false)
  const { t } = useI18n()
  const text = result.content ?? ''
  const long = text.length > PREVIEW_CHARS
  const shown = expanded || !long ? text : text.slice(0, PREVIEW_CHARS)

  return (
    <div className={`tool-result${result.isError ? ' tool-result-error' : ''}`}>
      <div className="tool-result-head">
        <span className="tool-result-label">
          {result.isError ? <XCircle size={13} /> : <CornerDownRight size={13} />}
          {result.isError ? t('result.error') : t('result.result')}
        </span>
        {result.images > 0 && (
          <span className="tool-result-images">
            <ImageIcon size={13} />
            {t('result.images', { n: result.images })}
          </span>
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
          {expanded ? t('result.showLess') : t('result.showMore', { n: text.length - PREVIEW_CHARS })}
        </button>
      )}
    </div>
  )
}
