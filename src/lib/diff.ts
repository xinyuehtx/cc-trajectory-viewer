import { diffLines } from 'diff'

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

/** Build diff rows from an old/new string pair using jsdiff line diffing. */
function buildRows(oldStr: string, newStr: string): {
  rows: DiffRow[]
  added: number
  removed: number
} {
  const parts = diffLines(oldStr, newStr)
  const rows: DiffRow[] = []
  let oldNo = 1
  let newNo = 1
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
