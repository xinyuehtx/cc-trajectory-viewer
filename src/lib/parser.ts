import type {
  ContentBlock,
  ModifiedFile,
  ParsedTrajectory,
  RawLine,
  SessionMeta,
  SessionStats,
  TimelineEvent,
  ToolResult,
  ToolResultBlock,
  ToolResultContentItem,
} from '../types'

/** Tools whose input represents a file modification we can render as a diff. */
export const EDIT_TOOLS = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit'])

let uid = 0
function nextId(prefix: string): string {
  uid += 1
  return `${prefix}-${uid}`
}

function stringifyResultContent(
  content: string | ToolResultContentItem[] | undefined,
): { text: string; images: number } {
  if (content == null) return { text: '', images: 0 }
  if (typeof content === 'string') return { text: content, images: 0 }
  let images = 0
  const parts: string[] = []
  for (const item of content) {
    if (item.type === 'text') parts.push(item.text)
    else if (item.type === 'image') images += 1
  }
  return { text: parts.join('\n'), images }
}

function filePathOf(input: Record<string, unknown>): string | undefined {
  const p = input.file_path ?? input.notebook_path ?? input.path
  return typeof p === 'string' ? p : undefined
}

/**
 * Parse a raw .jsonl trajectory string into an ordered, normalized timeline
 * plus session metadata, stats and the list of modified files.
 */
export function parseTrajectory(raw: string): ParsedTrajectory {
  uid = 0
  const lines = raw.split('\n')

  // First pass: collect tool_result blocks keyed by tool_use_id so we can
  // attach a result to its originating tool_use even though results arrive on
  // a later `user` line.
  const results = new Map<string, ToolResult>()
  const parsed: RawLine[] = []
  let parseErrors = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    let obj: RawLine
    try {
      obj = JSON.parse(trimmed) as RawLine
    } catch {
      parseErrors += 1
      continue
    }
    parsed.push(obj)

    const content = obj.message?.content
    if (Array.isArray(content)) {
      for (const block of content) {
        if (block && (block as ContentBlock).type === 'tool_result') {
          const tr = block as ToolResultBlock
          const { text, images } = stringifyResultContent(tr.content)
          results.set(tr.tool_use_id, {
            content: text,
            isError: Boolean(tr.is_error),
            images,
          })
        }
      }
    }
  }

  const events: TimelineEvent[] = []
  const meta: SessionMeta = {}
  const stats: SessionStats = {
    totalEvents: 0,
    userMessages: 0,
    assistantMessages: 0,
    toolCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
  }
  const modifiedMap = new Map<string, ModifiedFile>()

  for (const obj of parsed) {
    // Session metadata: take the first non-empty value we see.
    if (!meta.sessionId && obj.sessionId) meta.sessionId = obj.sessionId
    if (!meta.cwd && obj.cwd) meta.cwd = obj.cwd
    if (!meta.gitBranch && obj.gitBranch) meta.gitBranch = obj.gitBranch
    if (!meta.version && obj.version) meta.version = obj.version
    if (obj.timestamp) {
      if (!meta.firstTimestamp) meta.firstTimestamp = obj.timestamp
      meta.lastTimestamp = obj.timestamp
    }

    // Title from summary / ai-title lines.
    if ((obj.type === 'summary' || obj.type === 'ai-title') && !meta.title) {
      const t = obj.summary ?? obj.title
      if (typeof t === 'string' && t.trim()) meta.title = t.trim()
    }

    if (obj.type === 'system') {
      const content = obj.message?.content ?? (obj as { content?: unknown }).content
      const text = typeof content === 'string' ? content : ''
      if (text.trim()) {
        events.push({
          kind: 'system',
          id: nextId('sys'),
          text,
          level: typeof obj.level === 'string' ? obj.level : undefined,
          timestamp: obj.timestamp,
        })
      }
      continue
    }

    if (obj.type !== 'user' && obj.type !== 'assistant') continue

    const msg = obj.message
    if (!msg) continue
    if (msg.model && !meta.model) meta.model = msg.model

    if (msg.usage) {
      stats.inputTokens += msg.usage.input_tokens ?? 0
      stats.outputTokens += msg.usage.output_tokens ?? 0
      stats.cacheReadTokens += msg.usage.cache_read_input_tokens ?? 0
      stats.cacheCreationTokens += msg.usage.cache_creation_input_tokens ?? 0
    }

    const content = msg.content

    if (obj.type === 'user') {
      // A user line is either a real user prompt (string / text blocks) or a
      // carrier for tool_result blocks (already indexed above — skip those).
      if (typeof content === 'string') {
        if (content.trim()) {
          stats.userMessages += 1
          events.push({
            kind: 'user-text',
            id: nextId('user'),
            uuid: obj.uuid,
            text: content,
            timestamp: obj.timestamp,
            isSidechain: obj.isSidechain,
          })
        }
      } else if (Array.isArray(content)) {
        const texts = content
          .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b?.type === 'text')
          .map((b) => b.text)
          .filter((t) => t && t.trim())
        if (texts.length) {
          stats.userMessages += 1
          events.push({
            kind: 'user-text',
            id: nextId('user'),
            uuid: obj.uuid,
            text: texts.join('\n\n'),
            timestamp: obj.timestamp,
            isSidechain: obj.isSidechain,
          })
        }
      }
      continue
    }

    // assistant — emit in a fixed order (thinking → merged text → tool calls)
    // so that "consecutive tool calls" cluster deterministically and match the
    // ordering the CLI's `extract` command reconstructs.
    if (!Array.isArray(content)) continue
    const textParts: string[] = []
    for (const block of content) {
      if (!block) continue
      if (block.type === 'thinking') {
        if (block.thinking?.trim()) {
          events.push({
            kind: 'thinking',
            id: nextId('think'),
            text: block.thinking,
            timestamp: obj.timestamp,
            isSidechain: obj.isSidechain,
          })
        }
      } else if (block.type === 'text') {
        if (block.text?.trim()) textParts.push(block.text)
      }
    }
    if (textParts.length) {
      stats.assistantMessages += 1
      events.push({
        kind: 'assistant-text',
        id: nextId('asst'),
        uuid: obj.uuid,
        text: textParts.join('\n\n'),
        timestamp: obj.timestamp,
        model: msg.model,
        isSidechain: obj.isSidechain,
      })
    }
    for (const block of content) {
      if (!block) continue
      if (block.type === 'tool_use') {
        stats.toolCalls += 1
        const fp = filePathOf(block.input || {})
        const eventId = nextId('tool')
        const isEdit = EDIT_TOOLS.has(block.name)
        events.push({
          kind: 'tool-call',
          id: eventId,
          toolUseId: block.id,
          name: block.name,
          input: block.input || {},
          result: results.get(block.id),
          timestamp: obj.timestamp,
          isSidechain: obj.isSidechain,
          filePath: isEdit ? fp : undefined,
        })
        if (isEdit && fp) {
          const existing = modifiedMap.get(fp)
          if (existing) existing.edits += 1
          else modifiedMap.set(fp, { path: fp, firstEventId: eventId, edits: 1 })
        }
      }
    }
  }

  stats.totalEvents = events.length

  return {
    events,
    meta,
    stats,
    modifiedFiles: [...modifiedMap.values()],
    parseErrors,
  }
}
