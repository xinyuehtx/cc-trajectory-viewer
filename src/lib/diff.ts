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
// Instead of one card per edit event, we replay each file's Reads and edits in
// order to reconstruct its content and show a single net diff per file. Reads
// anchor known regions to their real line numbers, so edits land at the right
// place and the diff shows true line numbers. When the file is changed by
// something outside the trajectory (a non-Agent edit), a later Agent edit's
// `old_string` can no longer be found in our reconstruction — the only reliable
// "destructive change" signal in the log — so we close the current version and
// open a new one (v1, v2, …).
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

/**
 * Recover file text (and its real starting line number) from a Claude Code Read
 * result, whose lines look like `<lineno>\t<content>`.
 */
interface ReadSeed {
  lines: string[]
  /** real line number of lines[0] */
  startLine: number
}

function parseReadContent(raw: string): ReadSeed {
  const rawLines = raw.split('\n')
  const out: string[] = []
  let firstNo: number | undefined
  for (const line of rawLines) {
    const m = line.match(/^\s*(\d+)\t(.*)$/)
    if (!m) continue
    if (firstNo === undefined) firstNo = Number(m[1])
    out.push(m[2])
  }
  return { lines: out, startLine: firstNo ?? 1 }
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

/**
 * A contiguous known region of a file. `base` is the original text (first time
 * we saw it, via a Read or the first edit that touched it); `doc` is the text
 * after the Agent's edits. `startLine` is the region's real 1-based line number,
 * so the rendered diff shows true line numbers.
 */
interface Segment {
  startLine: number
  base: string[]
  doc: string[]
}

const join = (lines: string[]) => lines.join('\n')

/** Merge segments that have become physically contiguous and still pristine. */
function mergeContiguous(segments: Segment[]): Segment[] {
  const sorted = [...segments].sort((a, b) => a.startLine - b.startLine)
  const out: Segment[] = []
  for (const seg of sorted) {
    const prev = out[out.length - 1]
    const prevPristine = prev && join(prev.base) === join(prev.doc)
    const segPristine = join(seg.base) === join(seg.doc)
    if (prev && prevPristine && segPristine && prev.startLine + prev.base.length === seg.startLine) {
      prev.base.push(...seg.base)
      prev.doc.push(...seg.doc)
    } else {
      out.push({ startLine: seg.startLine, base: [...seg.base], doc: [...seg.doc] })
    }
  }
  return out
}

/** Register a Read's lines as base knowledge for regions not yet known. */
function registerRead(segments: Segment[], seed: ReadSeed): Segment[] {
  if (!seed.lines.length) return segments
  const known = new Set<number>()
  for (const s of segments) for (let i = 0; i < s.base.length; i++) known.add(s.startLine + i)

  let runStart = -1
  let run: string[] = []
  const flush = () => {
    if (run.length) segments.push({ startLine: runStart, base: [...run], doc: [...run] })
    run = []
    runStart = -1
  }
  seed.lines.forEach((line, i) => {
    const no = seed.startLine + i
    if (known.has(no)) {
      flush()
    } else {
      if (runStart === -1) runStart = no
      run.push(line)
    }
  })
  flush()
  return mergeContiguous(segments)
}

interface VersionState {
  segments: Segment[]
  hasRead: boolean
  external: boolean
  editIds: string[]
  firstEventId: string
}

/** Turn a finished version's segments into a renderable FileVersion. */
function renderVersion(v: VersionState, index: number): FileVersion {
  const sorted = [...v.segments].sort((a, b) => a.startLine - b.startLine)
  const rows: DiffRow[] = []
  let added = 0
  let removed = 0
  for (const seg of sorted) {
    const r = buildRows(join(seg.base), join(seg.doc), seg.startLine, seg.startLine)
    rows.push(...r.rows)
    added += r.added
    removed += r.removed
  }
  return {
    index,
    external: v.external,
    firstEventId: v.firstEventId,
    editIds: v.editIds,
    rows: collapseContext(rows),
    added,
    removed,
    isFullFile: sorted.length > 0 && sorted.every((s) => s.base.length === 0),
  }
}

/**
 * Reconstruct every edited file into one (or more) versions and build a lookup
 * from each edit event to the version card that should be scrolled to. Reads are
 * replayed inline so each edit is anchored to the region it was read from, which
 * gives the aggregated diff the file's real line numbers.
 */
export function buildFileHistories(events: TimelineEvent[]): AggregatedDiffs {
  const pathOf = (call: ToolCallEvent) =>
    (call.input.file_path as string) ||
    (call.input.notebook_path as string) ||
    (call.input.path as string) ||
    ''

  // Per file, the ordered stream of reads and (successful) edits.
  type Step = { type: 'read'; seed: ReadSeed } | { type: 'edit'; call: ToolCallEvent }
  const stepsByPath = new Map<string, Step[]>()
  const order: string[] = []
  const push = (path: string, step: Step) => {
    if (!stepsByPath.has(path)) {
      stepsByPath.set(path, [])
      order.push(path)
    }
    stepsByPath.get(path)!.push(step)
  }

  for (const ev of events) {
    if (ev.kind !== 'tool-call') continue
    const path = pathOf(ev)
    if (!path) continue
    if (ev.name === 'Read' && ev.result?.content && !ev.result.isError) {
      push(path, { type: 'read', seed: parseReadContent(ev.result.content) })
    } else if (EDIT_TOOLS.has(ev.name)) {
      // A failed edit (old_string not found, etc.) never touched the file — skip
      // it so it neither corrupts the reconstruction nor looks like an external
      // change.
      if (ev.result?.isError) continue
      push(path, { type: 'edit', call: ev })
    }
  }

  const histories: FileHistory[] = []
  const anchorByEvent = new Map<string, string>()

  for (const path of order) {
    const steps = stepsByPath.get(path)!
    if (!steps.some((s) => s.type === 'edit')) continue
    const language = guessLanguage(path)
    const versions: FileVersion[] = []
    let cur: VersionState = {
      segments: [],
      hasRead: false,
      external: false,
      editIds: [],
      firstEventId: '',
    }
    let editCount = 0

    const sparseLine = () =>
      cur.segments.reduce((mx, s) => Math.max(mx, s.startLine + s.base.length), 0) + 1 || 1

    for (const step of steps) {
      if (step.type === 'read') {
        cur.segments = registerRead(cur.segments, step.seed)
        if (step.seed.lines.length) cur.hasRead = true
        continue
      }

      const e = step.call
      editCount += 1
      if (!cur.firstEventId) cur.firstEventId = e.id
      cur.editIds.push(e.id)
      const ops = editOps(e)

      if (ops.kind === 'write') {
        // A full overwrite is an Agent action — replace all content in place.
        cur.segments = [{ startLine: 1, base: [], doc: ops.content.split('\n') }]
        continue
      }

      for (const pair of ops.pairs) {
        const seg = cur.segments.find((s) => pair.old !== '' && join(s.doc).includes(pair.old))
        if (seg) {
          seg.doc = replaceIn(join(seg.doc), pair.old, pair.new, pair.all).split('\n')
        } else if (cur.hasRead && pair.old !== '' && cur.editIds.length > 1) {
          // We had the file's content and the old_string is gone → something
          // outside the trajectory changed it. Close this version, open a new one.
          versions.push(renderVersion(cur, versions.length))
          cur = {
            segments: [{ startLine: 1, base: pair.old.split('\n'), doc: pair.new.split('\n') }],
            hasRead: false,
            external: true,
            editIds: [e.id],
            firstEventId: e.id,
          }
        } else {
          // Unread / disjoint region — record it without splitting.
          cur.segments.push({
            startLine: sparseLine(),
            base: pair.old.split('\n'),
            doc: pair.new.split('\n'),
          })
        }
      }
    }
    versions.push(renderVersion(cur, versions.length))

    for (const v of versions) {
      const anchor = `diff-${v.firstEventId}`
      for (const id of v.editIds) anchorByEvent.set(id, anchor)
    }

    const added = versions.reduce((n, v) => n + v.added, 0)
    const removed = versions.reduce((n, v) => n + v.removed, 0)
    histories.push({ path, language, versions, editCount, added, removed })
  }

  return { histories, anchorByEvent }
}
