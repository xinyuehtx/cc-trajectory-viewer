import { diffLines } from 'diff'
import type { TimelineEvent, ToolCallEvent } from '../types'
import { EDIT_TOOLS } from './parser'

export interface DiffRow {
  type: 'add' | 'del' | 'ctx'
  /** old-file line number (undefined for additions) */
  oldNo?: number
  /** new-file line number (undefined for deletions) */
  newNo?: number
  text: string
}

/** A row in the side-by-side (split) view: left = old side, right = new side. */
export interface SplitRow {
  left?: DiffRow
  right?: DiffRow
}

export interface FileDiff {
  filePath: string
  /** short label describing the operation */
  label: string
  language?: string
  rows: DiffRow[]
  added: number
  removed: number
  /** true when this represents a brand new / fully-overwritten file */
  isFullFile: boolean
}

function guessLanguage(path: string | undefined): string | undefined {
  if (!path) return undefined
  const ext = path.split('.').pop()?.toLowerCase()
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    json: 'json',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    cc: 'cpp',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'ini',
    md: 'markdown',
    html: 'xml',
    xml: 'xml',
    css: 'css',
    scss: 'scss',
    sql: 'sql',
  }
  return ext ? map[ext] : undefined
}

/** Split into lines without producing a trailing empty element for a final \n. */
function splitLines(s: string): string[] {
  if (s === '') return []
  const parts = s.split('\n')
  if (parts.length > 1 && parts[parts.length - 1] === '') parts.pop()
  return parts
}

/**
 * Build diff rows from an old/new string pair using jsdiff line diffing.
 * `startOld` / `startNew` set the first line number so aggregated diffs seeded
 * from a full-file Read show the file's real line numbers.
 */
function buildRows(
  oldStr: string,
  newStr: string,
  startOld = 1,
  startNew = 1,
): {
  rows: DiffRow[]
  added: number
  removed: number
} {
  const parts = diffLines(oldStr, newStr)
  const rows: DiffRow[] = []
  let oldNo = startOld
  let newNo = startNew
  let added = 0
  let removed = 0

  for (const part of parts) {
    const lines = splitLines(part.value)
    if (part.added) {
      for (const line of lines) {
        rows.push({ type: 'add', newNo, text: line })
        newNo += 1
        added += 1
      }
    } else if (part.removed) {
      for (const line of lines) {
        rows.push({ type: 'del', oldNo, text: line })
        oldNo += 1
        removed += 1
      }
    } else {
      for (const line of lines) {
        rows.push({ type: 'ctx', oldNo, newNo, text: line })
        oldNo += 1
        newNo += 1
      }
    }
  }
  return { rows, added, removed }
}

/**
 * Convert unified diff rows into aligned side-by-side rows: deletions on the
 * left, additions on the right, context on both. Runs of deletions/additions
 * are zipped together so a changed line shows old vs new on the same visual row.
 */
export function toSplitRows(rows: DiffRow[]): SplitRow[] {
  const out: SplitRow[] = []
  let i = 0
  while (i < rows.length) {
    const row = rows[i]
    if (row.type === 'ctx') {
      out.push({ left: row, right: row })
      i += 1
      continue
    }
    const dels: DiffRow[] = []
    const adds: DiffRow[] = []
    while (i < rows.length && rows[i].type === 'del') dels.push(rows[i++])
    while (i < rows.length && rows[i].type === 'add') adds.push(rows[i++])
    const max = Math.max(dels.length, adds.length)
    for (let k = 0; k < max; k++) {
      out.push({ left: dels[k], right: adds[k] })
    }
  }
  return out
}

/**
 * Turn a file-editing tool call (Edit / MultiEdit / Write / NotebookEdit) into
 * a renderable FileDiff. Returns null if the tool isn't a file edit.
 */
export function buildFileDiff(
  toolName: string,
  input: Record<string, unknown>,
): FileDiff | null {
  const filePath =
    (input.file_path as string) ||
    (input.notebook_path as string) ||
    (input.path as string) ||
    ''
  const language = guessLanguage(filePath)

  if (toolName === 'Write') {
    const content = typeof input.content === 'string' ? input.content : ''
    const { rows, added } = buildRows('', content)
    return {
      filePath,
      label: 'Write (new / overwritten file)',
      language,
      rows,
      added,
      removed: 0,
      isFullFile: true,
    }
  }

  if (toolName === 'Edit') {
    const oldStr = typeof input.old_string === 'string' ? input.old_string : ''
    const newStr = typeof input.new_string === 'string' ? input.new_string : ''
    const replaceAll = Boolean(input.replace_all)
    const { rows, added, removed } = buildRows(oldStr, newStr)
    return {
      filePath,
      label: replaceAll ? 'Edit (replace all)' : 'Edit',
      language,
      rows,
      added,
      removed,
      isFullFile: false,
    }
  }

  if (toolName === 'MultiEdit') {
    const edits = Array.isArray(input.edits) ? input.edits : []
    const allRows: DiffRow[] = []
    let added = 0
    let removed = 0
    edits.forEach((e, i) => {
      const edit = e as { old_string?: string; new_string?: string }
      const r = buildRows(edit.old_string ?? '', edit.new_string ?? '')
      if (i > 0) allRows.push({ type: 'ctx', text: '⋯' })
      allRows.push(...r.rows)
      added += r.added
      removed += r.removed
    })
    return {
      filePath,
      label: `MultiEdit (${edits.length} edit${edits.length === 1 ? '' : 's'})`,
      language,
      rows: allRows,
      added,
      removed,
      isFullFile: false,
    }
  }

  if (toolName === 'NotebookEdit') {
    const src = typeof input.new_source === 'string' ? input.new_source : ''
    const { rows, added } = buildRows('', src)
    return {
      filePath,
      label: 'NotebookEdit',
      language,
      rows,
      added,
      removed: 0,
      isFullFile: true,
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Per-file aggregation (Diffs tab)
//
// Instead of one card per edit event, we reconstruct each file's content by
// chaining its edits and show a single net diff per file. When the file is
// changed by something outside the trajectory (a non-Agent edit), the next
// Agent edit's `old_string` can no longer be found in our reconstruction — that
// is the only reliable "destructive change" signal in the log, so we close the
// current version and open a new one (v1, v2, …).
// ---------------------------------------------------------------------------

/** A single reconstructed version of a file (between destructive changes). */
export interface FileVersion {
  /** 0-based order within the file */
  index: number
  /** true when this version was opened by a detected external change */
  external: boolean
  /** anchor: the first edit event id that belongs to this version */
  firstEventId: string
  /** every edit event id folded into this version */
  editIds: string[]
  rows: DiffRow[]
  added: number
  removed: number
  /** true when the version starts from an empty base (new / overwritten file) */
  isFullFile: boolean
}

export interface FileHistory {
  path: string
  language?: string
  versions: FileVersion[]
  editCount: number
  added: number
  removed: number
}

export interface AggregatedDiffs {
  histories: FileHistory[]
  /** edit event id → DOM anchor id of the version card that contains it */
  anchorByEvent: Map<string, string>
}

/** Recover file text from a Claude Code Read result (`<lineno>\t<content>`). */
interface ReadSeed {
  text: string
  /** line number of the first recovered line (1 for a full read) */
  startLine: number
  /** true when the read starts at line 1 (full file — safe to detect splits) */
  fromTop: boolean
  /** number of recovered lines (used to pick the widest seed) */
  lines: number
}

function parseReadContent(raw: string): ReadSeed {
  const lines = raw.split('\n')
  const out: string[] = []
  let firstNo: number | undefined
  for (const line of lines) {
    const m = line.match(/^\s*(\d+)\t(.*)$/)
    if (!m) continue
    if (firstNo === undefined) firstNo = Number(m[1])
    out.push(m[2])
  }
  return {
    text: out.length ? out.join('\n') : '',
    startLine: firstNo ?? 1,
    fromTop: firstNo === 1,
    lines: out.length,
  }
}

function replaceIn(doc: string, oldStr: string, newStr: string, all: boolean): string {
  if (oldStr === '') return doc
  if (all) return doc.split(oldStr).join(newStr)
  const idx = doc.indexOf(oldStr)
  if (idx === -1) return doc
  return doc.slice(0, idx) + newStr + doc.slice(idx + oldStr.length)
}

interface ReplacePair {
  old: string
  new: string
  all: boolean
}

/** Normalize an edit tool call into either a full overwrite or replace pairs. */
function editOps(
  e: ToolCallEvent,
): { kind: 'write'; content: string } | { kind: 'replace'; pairs: ReplacePair[] } {
  const input = e.input
  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  if (e.name === 'Write') return { kind: 'write', content: s(input.content) }
  if (e.name === 'NotebookEdit') return { kind: 'write', content: s(input.new_source) }
  if (e.name === 'MultiEdit') {
    const edits = Array.isArray(input.edits) ? input.edits : []
    const pairs = edits.map((raw) => {
      const ed = raw as { old_string?: string; new_string?: string; replace_all?: boolean }
      return { old: ed.old_string ?? '', new: ed.new_string ?? '', all: Boolean(ed.replace_all) }
    })
    return { kind: 'replace', pairs }
  }
  // Edit
  return {
    kind: 'replace',
    pairs: [{ old: s(input.old_string), new: s(input.new_string), all: Boolean(input.replace_all) }],
  }
}

/**
 * Collapse long runs of unchanged context into a single `⋯` marker, keeping a
 * few lines around each change — the usual unified-diff hunk behavior. Keeps
 * the aggregated (whole-file) net diff readable.
 */
function collapseContext(rows: DiffRow[], context = 3): DiffRow[] {
  const keep = new Array(rows.length).fill(false)
  let hasChange = false
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].type !== 'ctx') {
      hasChange = true
      for (let j = Math.max(0, i - context); j <= Math.min(rows.length - 1, i + context); j++) {
        keep[j] = true
      }
    }
  }
  if (!hasChange) return rows
  const out: DiffRow[] = []
  let gapping = false
  for (let i = 0; i < rows.length; i++) {
    if (keep[i]) {
      out.push(rows[i])
      gapping = false
    } else if (!gapping) {
      out.push({ type: 'ctx', text: '⋯' })
      gapping = true
    }
  }
  return out
}

/** Build one FileVersion from a reconstructed base→final content pair. */
function makeVersion(
  base: string,
  doc: string,
  index: number,
  external: boolean,
  firstEventId: string,
  editIds: string[],
  startLine: number,
): FileVersion {
  const { rows, added, removed } = buildRows(base, doc, startLine, startLine)
  return {
    index,
    external,
    firstEventId,
    editIds,
    rows: collapseContext(rows),
    added,
    removed,
    isFullFile: base === '',
  }
}

/**
 * Reconstruct every edited file into one (or more) net-diff versions and build
 * a lookup from each edit event to the version card that should be scrolled to.
 */
export function buildFileHistories(events: TimelineEvent[]): AggregatedDiffs {
  // Gather, per path and in order, the edit events plus any preceding Read that
  // can seed an accurate original baseline.
  const editsByPath = new Map<string, ToolCallEvent[]>()
  const seedByPath = new Map<string, ReadSeed>()
  const firstEditOrder = new Map<string, number>()
  const readsByPath = new Map<string, { order: number; parsed: ReadSeed }[]>()

  events.forEach((ev, order) => {
    if (ev.kind !== 'tool-call') return
    const call = ev
    const path =
      (call.input.file_path as string) ||
      (call.input.notebook_path as string) ||
      (call.input.path as string) ||
      ''
    if (!path) return
    if (call.name === 'Read' && call.result?.content && !call.result.isError) {
      const list = readsByPath.get(path) ?? []
      list.push({ order, parsed: parseReadContent(call.result.content) })
      readsByPath.set(path, list)
      return
    }
    if (EDIT_TOOLS.has(call.name)) {
      // A failed edit (old_string not found, etc.) never touched the file —
      // skip it so it neither corrupts the reconstruction nor looks external.
      if (call.result?.isError) return
      if (!editsByPath.has(path)) {
        editsByPath.set(path, [])
        firstEditOrder.set(path, order)
      }
      editsByPath.get(path)!.push(call)
    }
  })

  // Pick the best seed before the first edit: prefer a full-from-top Read (safe
  // for split detection + correct line numbers); otherwise the widest read.
  for (const [path, firstOrder] of firstEditOrder) {
    const reads = (readsByPath.get(path) ?? []).filter((r) => r.order < firstOrder && r.parsed.text)
    let fromTop: ReadSeed | undefined
    let widest: ReadSeed | undefined
    for (const r of reads) {
      if (r.parsed.fromTop) fromTop = r.parsed
      if (!widest || r.parsed.lines > widest.lines) widest = r.parsed
    }
    const best = fromTop ?? widest
    if (best) seedByPath.set(path, best)
  }

  const histories: FileHistory[] = []
  const anchorByEvent = new Map<string, string>()

  for (const [path, edits] of editsByPath) {
    const language = guessLanguage(path)
    const seed = seedByPath.get(path)
    // `seeded` = we have the full original file (from-top read), so an unmatched
    // old_string is a trustworthy external-change signal. Without it we never
    // split. `startLine` gives the aggregated diff the file's real line numbers.
    let seeded = Boolean(seed?.fromTop)
    let base = seed?.text ?? ''
    let doc = base
    let versionStart = base
    let versionStartLine = seed?.startLine ?? 1
    let versionExternal = false
    let versionEditIds: string[] = []
    let versionFirstEventId = edits[0].id
    const versions: FileVersion[] = []

    const closeVersion = () => {
      versions.push(
        makeVersion(
          versionStart,
          doc,
          versions.length,
          versionExternal,
          versionFirstEventId,
          versionEditIds,
          versionStartLine,
        ),
      )
    }

    for (const e of edits) {
      const ops = editOps(e)
      if (versionEditIds.length === 0) versionFirstEventId = e.id
      versionEditIds.push(e.id)

      if (ops.kind === 'write') {
        // A full overwrite is an Agent action — same version, replace content.
        doc = ops.content
        continue
      }

      for (const pair of ops.pairs) {
        if (pair.old !== '' && doc.includes(pair.old)) {
          doc = replaceIn(doc, pair.old, pair.new, pair.all)
        } else if (seeded && pair.old !== '') {
          // old_string not in the reconstructed file → external change detected.
          closeVersion()
          seeded = false // reconstruction model is broken past this point
          versionStart = pair.old
          doc = pair.new
          versionStartLine = 1 // real position unknown after an external change
          versionExternal = true
          versionEditIds = [e.id]
          versionFirstEventId = e.id
        } else {
          // Sparse / disjoint region — accumulate without splitting.
          versionStart += (versionStart ? '\n' : '') + pair.old
          doc += (doc ? '\n' : '') + pair.new
        }
      }
    }
    closeVersion()

    // Map every edit event to its version's anchor.
    for (const v of versions) {
      const anchor = `diff-${v.firstEventId}`
      for (const id of v.editIds) anchorByEvent.set(id, anchor)
    }

    const added = versions.reduce((n, v) => n + v.added, 0)
    const removed = versions.reduce((n, v) => n + v.removed, 0)
    histories.push({ path, language, versions, editCount: edits.length, added, removed })
  }

  return { histories, anchorByEvent }
}
