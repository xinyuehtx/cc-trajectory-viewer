// Heuristics shared by the timeline renderer. Keep the tool-execution prefix
// list in sync with the copy in `bin/units.js` (which cannot import this TS
// module) so the offline annotation scaffold collapses the same messages.

/**
 * Assistant text that merely narrates a tool run ("Executed …", "Running …",
 * "已执行 …") is low-signal, so we collapse it by default and let meaningful
 * prose stay open. Matches a leading verb, case-insensitive, after trimming.
 */
const TOOL_EXECUTION_PREFIX =
  /^(executed|executing|running|ran|已执行|正在执行|执行了|执行完成|已运行|运行了)/i

export function isToolExecutionText(text: string): boolean {
  return TOOL_EXECUTION_PREFIX.test(text.trimStart())
}

/** First line of a message, trimmed and length-capped, for a collapsed preview. */
export function firstLine(text: string, max = 100): string {
  const line = text.trimStart().split('\n', 1)[0].trim()
  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}
