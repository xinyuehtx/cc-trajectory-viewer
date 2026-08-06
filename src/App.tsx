import { useCallback, useEffect, useMemo, useState } from 'react'
import { parseTrajectory, EDIT_TOOLS } from './lib/parser'
import {
  emptyIndex,
  indexAnnotations,
  parseAnnotations,
  type AnnotationIndex,
} from './lib/annotations'
import type { ToolCallEvent } from './types'
import { NavContext } from './nav'
import Uploader from './components/Uploader'
import Sidebar from './components/Sidebar'
import Timeline from './components/Timeline'
import DiffsTab from './components/DiffsTab'
import type { DiffMode } from './components/DiffView'

type Tab = 'timeline' | 'diffs'

export default function App() {
  const [raw, setRaw] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | undefined>()
  const [annRaw, setAnnRaw] = useState<string | null>(null)
  const [error, setError] = useState<string | undefined>()
  const [booting, setBooting] = useState(true)

  const [tab, setTab] = useState<Tab>('timeline')
  const [diffMode, setDiffMode] = useState<DiffMode>('unified')
  const [showTranslations, setShowTranslations] = useState(true)

  const handleLoad = useCallback((text: string, name: string) => {
    if (!text.trim()) {
      setError('The file is empty.')
      return
    }
    setError(undefined)
    setRaw(text)
    setFileName(name)
  }, [])

  const handleLoadAnnotations = useCallback((text: string) => {
    setAnnRaw(text)
  }, [])

  // On boot, try CLI-served endpoints and ?src=/?ann= URL params.
  useEffect(() => {
    let cancelled = false
    const tryFetch = async (url: string) => {
      try {
        const res = await fetch(url)
        if (!res.ok) return null
        const text = await res.text()
        return text.trim() ? text : null
      } catch {
        return null
      }
    }
    const bootstrap = async () => {
      const params = new URLSearchParams(window.location.search)
      const src = params.get('src')
      const ann = params.get('ann')

      const trajUrl = src || './api/trajectory'
      const trajText = await tryFetch(trajUrl)
      if (trajText && !cancelled) {
        handleLoad(trajText, src ? src.split('/').pop() || 'trajectory.jsonl' : 'trajectory.jsonl')
      }
      const annText = await tryFetch(ann || './api/annotations')
      if (annText && !cancelled) setAnnRaw(annText)
    }
    bootstrap().finally(() => {
      if (!cancelled) setBooting(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const parsed = useMemo(() => {
    if (!raw) return null
    try {
      return parseTrajectory(raw)
    } catch (e) {
      setError(`Failed to parse: ${(e as Error).message}`)
      return null
    }
  }, [raw])

  const annotations: AnnotationIndex = useMemo(() => {
    if (!annRaw) return emptyIndex()
    return indexAnnotations(parseAnnotations(annRaw))
  }, [annRaw])

  const edits: ToolCallEvent[] = useMemo(() => {
    if (!parsed) return []
    return parsed.events.filter(
      (e): e is ToolCallEvent => e.kind === 'tool-call' && EDIT_TOOLS.has(e.name),
    )
  }, [parsed])

  const openDiff = useCallback((eventId: string) => {
    setTab('diffs')
    // Wait for the Diffs tab to render before scrolling to the card.
    setTimeout(() => {
      const el = document.getElementById(`diff-${eventId}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }, [])

  const reset = useCallback(() => {
    setRaw(null)
    setAnnRaw(null)
    setFileName(undefined)
    setError(undefined)
    setTab('timeline')
  }, [])

  if (booting && !raw) {
    return (
      <div className="boot-screen">
        <span className="logo-big spin">◆</span>
      </div>
    )
  }

  if (!parsed) {
    return <Uploader onLoad={handleLoad} error={error} />
  }

  if (parsed.events.length === 0) {
    return (
      <Uploader
        onLoad={handleLoad}
        error="No renderable messages found — is this a Claude Code .jsonl trajectory?"
      />
    )
  }

  return (
    <NavContext.Provider value={{ openDiff }}>
      <div className="app">
        <Sidebar
          data={parsed}
          fileName={fileName}
          annotations={annotations}
          showTranslations={showTranslations}
          onToggleTranslations={() => setShowTranslations((v) => !v)}
          onLoadAnnotations={handleLoadAnnotations}
          onReset={reset}
          onOpenDiff={openDiff}
        />
        <main className="main">
          <div className="tabbar">
            <button
              className={`tab${tab === 'timeline' ? ' tab-active' : ''}`}
              onClick={() => setTab('timeline')}
            >
              Timeline
            </button>
            <button
              className={`tab${tab === 'diffs' ? ' tab-active' : ''}`}
              onClick={() => setTab('diffs')}
            >
              Diffs {edits.length > 0 && <span className="tab-count">{edits.length}</span>}
            </button>
          </div>

          <div className="tab-content">
            {tab === 'timeline' ? (
              <Timeline
                events={parsed.events}
                annotations={annotations}
                showTranslations={showTranslations}
              />
            ) : (
              <DiffsTab edits={edits} mode={diffMode} onModeChange={setDiffMode} />
            )}
          </div>
        </main>
      </div>
    </NavContext.Provider>
  )
}
