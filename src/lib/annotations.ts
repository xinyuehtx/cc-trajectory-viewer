// Sidecar annotation format (`*.trajv.json`) produced by the `view-trajectory`
// agent skill. It carries, per stable id:
//   - text translations, keyed by a message uuid
//   - tool-cluster summaries, keyed by the FIRST tool_use id of the cluster
// The viewer merges these into the rendered timeline.

export interface TextUnit {
  type: 'text'
  id: string // message uuid, or `${uuid}#t<index>` for a thinking (COT) block
  role?: 'user' | 'assistant' | 'thinking'
  original?: string
  translation?: string
}

export interface ClusterUnit {
  type: 'cluster'
  id: string // first tool_use id in the cluster
  tools?: string[]
  count?: number
  summary?: string
}

export type AnnotationUnit = TextUnit | ClusterUnit

export interface Annotations {
  version: number
  targetLang?: string
  units: AnnotationUnit[]
}

export interface AnnotationIndex {
  targetLang?: string
  translations: Map<string, string>
  summaries: Map<string, string>
  hasAny: boolean
}

const EMPTY: AnnotationIndex = {
  translations: new Map(),
  summaries: new Map(),
  hasAny: false,
}

export function emptyIndex(): AnnotationIndex {
  return EMPTY
}

export function parseAnnotations(raw: string): Annotations | null {
  try {
    const obj = JSON.parse(raw) as Annotations
    if (!obj || !Array.isArray(obj.units)) return null
    return obj
  } catch {
    return null
  }
}

export function indexAnnotations(ann: Annotations | null): AnnotationIndex {
  if (!ann) return EMPTY
  const translations = new Map<string, string>()
  const summaries = new Map<string, string>()
  for (const unit of ann.units) {
    if (unit.type === 'text' && unit.translation && unit.translation.trim()) {
      translations.set(unit.id, unit.translation)
    } else if (unit.type === 'cluster' && unit.summary && unit.summary.trim()) {
      summaries.set(unit.id, unit.summary)
    }
  }
  return {
    targetLang: ann.targetLang,
    translations,
    summaries,
    hasAny: translations.size > 0 || summaries.size > 0,
  }
}
