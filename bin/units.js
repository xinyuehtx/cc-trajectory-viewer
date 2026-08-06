// Build the ordered "annotation units" from a raw trajectory. This MUST mirror
// the normalized event ordering, tool-call clustering, and sidechain grouping
// used by the web viewer (src/lib/parser.ts + src/components/Timeline.tsx) so
// that unit ids line up:
//   - text units are keyed by the message uuid
//   - cluster units are keyed by the FIRST tool_use id in a run of consecutive
//     tool calls (a run is broken by any user/assistant text or thinking block)
//   - subagent units are keyed by the stable id of the FIRST event in a run of
//     consecutive sidechain (subagent) events
//
// Keep the tool-execution prefix regex in sync with src/lib/heuristics.ts.
const TOOL_EXECUTION_PREFIX =
  /^(executed|executing|running|ran|已执行|正在执行|执行了|执行完成|已运行|运行了)/i
function isToolExecutionText(text) {
  return TOOL_EXECUTION_PREFIX.test(String(text).replace(/^\s+/, ''))
}

/** @returns {Array<object>} ordered annotation units with empty fields to fill */
export function buildUnits(raw) {
  const lines = raw.split('\n')

  // 1) Flatten into ordered markers, matching the viewer's emission order.
  //    marker kinds: {k:'text', id, role, text, sc} | {k:'think', id, text, sc}
  //                | {k:'tool', id, name, sc}
  const markers = []
  for (const line of lines) {
    const t = line.trim()
    if (!t) continue
    let obj
    try {
      obj = JSON.parse(t)
    } catch {
      continue
    }
    if (obj.type !== 'user' && obj.type !== 'assistant') continue
    const msg = obj.message
    if (!msg) continue
    const content = msg.content
    const sc = Boolean(obj.isSidechain)

    if (obj.type === 'user') {
      let text = ''
      if (typeof content === 'string') text = content
      else if (Array.isArray(content)) {
        text = content
          .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
          .map((b) => b.text)
          .join('\n\n')
      }
      if (text.trim()) markers.push({ k: 'text', id: obj.uuid, role: 'user', text, sc })
      continue
    }

    // assistant: thinking → merged text → tool calls (same order as the viewer)
    if (!Array.isArray(content)) continue
    const textParts = []
    let thinkIdx = 0
    for (const b of content) {
      if (!b) continue
      if (b.type === 'thinking' && (b.thinking || '').trim()) {
        markers.push({
          k: 'think',
          id: obj.uuid ? `${obj.uuid}#t${thinkIdx}` : undefined,
          text: b.thinking,
          sc,
        })
        thinkIdx += 1
      } else if (b.type === 'text' && (b.text || '').trim()) textParts.push(b.text)
    }
    if (textParts.length) {
      markers.push({ k: 'text', id: obj.uuid, role: 'assistant', text: textParts.join('\n\n'), sc })
    }
    for (const b of content) {
      if (b && b.type === 'tool_use') markers.push({ k: 'tool', id: b.id, name: b.name, sc })
    }
  }

  // 2) Emit units. Consecutive 'tool' markers collapse into one cluster unit;
  //    an assistant "Executed …" text gets a fillable `summary`.
  const emitInner = (run, units) => {
    let cluster = null
    const flush = () => {
      if (cluster) {
        units.push({
          type: 'cluster',
          id: cluster.id,
          tools: cluster.tools,
          count: cluster.tools.length,
          summary: '',
        })
        cluster = null
      }
    }
    for (const m of run) {
      if (m.k === 'tool') {
        if (!cluster) cluster = { id: m.id, tools: [] }
        cluster.tools.push(m.name)
      } else if (m.k === 'text') {
        flush()
        const unit = { type: 'text', id: m.id, role: m.role, original: m.text, translation: '' }
        // Collapsed-by-default tool-execution narration also carries a summary.
        if (m.role === 'assistant' && isToolExecutionText(m.text)) unit.summary = ''
        units.push(unit)
      } else {
        // thinking breaks a cluster and is itself a translatable unit (COT text)
        flush()
        if (m.id) {
          units.push({ type: 'text', id: m.id, role: 'thinking', original: m.text, translation: '' })
        }
      }
    }
    flush()
  }

  // Split sidechain runs into their own subagent blocks first (mirrors
  // groupTimeline), then emit inner units for each run.
  const units = []
  let i = 0
  while (i < markers.length) {
    const sc = markers[i].sc
    const run = []
    while (i < markers.length && markers[i].sc === sc) run.push(markers[i++])
    if (sc) {
      units.push({ type: 'subagent', id: run[0].id, count: run.length, summary: '' })
    }
    emitInner(run, units)
  }
  return units
}
