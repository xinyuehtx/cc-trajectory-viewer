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
  // Optional one-line summary for a collapsed tool-execution message
  // (assistant text like "Executed …"), keyed by the same message uuid.
  summary?: string
}

export interface ClusterUnit {
  type: 'cluster'
  id: string // first tool_use id in the cluster
  tools?: string[]
  count?: number
  summary?: string
}

export interface SubagentUnit {
  type: 'subagent'
  id: string // stable id of the FIRST event in the sidechain run
  count?: number
  summary?: string
}

export type AnnotationUnit = TextUnit | ClusterUnit | SubagentUnit

export interface Annotations {
  version: number
  targetLang?: string
  units: AnnotationUnit[]
}

export interface AnnotationIndex {
  targetLang?: string
  translations: Map<string, string>
  summaries: Map<string, string>
  // Summaries for collapsed tool-execution messages, keyed by message uuid.
  execSummaries: Map<string, string>
  // Summaries for subagent (sidechain) blocks, keyed by first-event stable id.
  subagentSummaries: Map<string, string>
  hasAny: boolean
}

const EMPTY: AnnotationIndex = {
  translations: new Map(),
  summaries: new Map(),
  execSummaries: new Map(),
  subagentSummaries: new Map(),
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
  const execSummaries = new Map<string, string>()
  const subagentSummaries = new Map<string, string>()
  for (const unit of ann.units) {
    if (unit.type === 'text') {
      if (unit.translation && unit.translation.trim()) translations.set(unit.id, unit.translation)
      if (unit.summary && unit.summary.trim()) execSummaries.set(unit.id, unit.summary)
    } else if (unit.type === 'cluster') {
      if (unit.summary && unit.summary.trim()) summaries.set(unit.id, unit.summary)
    } else if (unit.type === 'subagent') {
      if (unit.summary && unit.summary.trim()) subagentSummaries.set(unit.id, unit.summary)
    }
  }
  return {
    targetLang: ann.targetLang,
    translations,
    summaries,
    execSummaries,
    subagentSummaries,
    hasAny:
      translations.size > 0 ||
      summaries.size > 0 ||
      execSummaries.size > 0 ||
      subagentSummaries.size > 0,
  }
}
