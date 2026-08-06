// ---------------------------------------------------------------------------
// Raw trajectory shapes (as they appear in a Claude Code .jsonl session file)
// ---------------------------------------------------------------------------

/** A block inside an assistant/user `message.content` array. */
export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
  signature?: string
}

export interface TextBlock {
  type: 'text'
  text: string
}

export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

/** tool_result content items can be plain text or images. */
export interface ResultTextItem {
  type: 'text'
  text: string
}
export interface ResultImageItem {
  type: 'image'
  source?: { type?: string; media_type?: string; data?: string }
}
export type ToolResultContentItem = ResultTextItem | ResultImageItem

export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string | ToolResultContentItem[]
  is_error?: boolean
}

export type ContentBlock =
  | ThinkingBlock
  | TextBlock
  | ToolUseBlock
  | ToolResultBlock

export interface Usage {
  input_tokens?: number
  output_tokens?: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

export interface RawMessage {
  role?: string
  model?: string
  content?: string | ContentBlock[]
  usage?: Usage
  stop_reason?: string | null
}

/** One parsed line of the .jsonl file. Only fields we use are typed. */
export interface RawLine {
  type: string
  uuid?: string
  parentUuid?: string | null
  isSidechain?: boolean
  timestamp?: string
  message?: RawMessage
  // session metadata (present on user/assistant lines)
  cwd?: string
  gitBranch?: string
  version?: string
  sessionId?: string
  slug?: string
  model?: string
  // summary / title lines
  summary?: string
  title?: string
  // allow anything else
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Normalized timeline the UI renders
// ---------------------------------------------------------------------------

export type Role = 'user' | 'assistant' | 'system'

export interface UserTextEvent {
  kind: 'user-text'
  id: string
  /** raw message uuid — stable key used to attach annotations (translations) */
  uuid?: string
  text: string
  timestamp?: string
  isSidechain?: boolean
}

export interface AssistantTextEvent {
  kind: 'assistant-text'
  id: string
  /** raw message uuid — stable key used to attach annotations (translations) */
  uuid?: string
  text: string
  timestamp?: string
  model?: string
  isSidechain?: boolean
}

export interface ThinkingEvent {
  kind: 'thinking'
  id: string
  text: string
  timestamp?: string
  isSidechain?: boolean
}

export interface ToolResult {
  content: string
  isError: boolean
  images: number
}

export interface ToolCallEvent {
  kind: 'tool-call'
  id: string
  toolUseId: string
  name: string
  input: Record<string, unknown>
  result?: ToolResult
  timestamp?: string
  isSidechain?: boolean
  /** file path if this call edits/writes a file */
  filePath?: string
}

export interface SystemEvent {
  kind: 'system'
  id: string
  text: string
  level?: string
  timestamp?: string
}

export type TimelineEvent =
  | UserTextEvent
  | AssistantTextEvent
  | ThinkingEvent
  | ToolCallEvent
  | SystemEvent

export interface SessionMeta {
  sessionId?: string
  cwd?: string
  gitBranch?: string
  version?: string
  model?: string
  title?: string
  firstTimestamp?: string
  lastTimestamp?: string
}

export interface SessionStats {
  totalEvents: number
  userMessages: number
  assistantMessages: number
  toolCalls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
}

export interface ModifiedFile {
  path: string
  /** anchor id of the first tool-call event that touched this file */
  firstEventId: string
  edits: number
}

export interface ParsedTrajectory {
  events: TimelineEvent[]
  meta: SessionMeta
  stats: SessionStats
  modifiedFiles: ModifiedFile[]
  parseErrors: number
}
