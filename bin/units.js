// Build the ordered "annotation units" from a raw trajectory. This MUST mirror
// the normalized event ordering and tool-call clustering used by the web viewer
// (src/lib/parser.ts + src/components/Timeline.tsx) so that unit ids line up:
//   - text units are keyed by the message uuid
//   - cluster units are keyed by the FIRST tool_use id in a run of consecutive
//     tool calls (a run is broken by any user/assistant text or thinking block)

/** @returns {Array<object>} ordered annotation units with empty fields to fill */
export function buildUnits(raw) {
  const lines = raw.split('\n')

  // 1) Flatten into ordered markers, matching the viewer's emission order.
  //    marker kinds: {k:'text', id, role, text} | {k:'think'} | {k:'tool', id, name}
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

    if (obj.type === 'user') {
      let text = ''
      if (typeof content === 'string') text = content
      else if (Array.isArray(content)) {
        text = content
          .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
          .map((b) => b.text)
          .join('\n\n')
      }
      if (text.trim()) markers.push({ k: 'text', id: obj.uuid, role: 'user', text })
      continue
    }

    // assistant: thinking → merged text → tool calls (same order as the viewer)
    if (!Array.isArray(content)) continue
    const textParts = []
    for (const b of content) {
      if (!b) continue
      if (b.type === 'thinking' && (b.thinking || '').trim()) markers.push({ k: 'think' })
      else if (b.type === 'text' && (b.text || '').trim()) textParts.push(b.text)
    }
    if (textParts.length) {
      markers.push({ k: 'text', id: obj.uuid, role: 'assistant', text: textParts.join('\n\n') })
    }
    for (const b of content) {
      if (b && b.type === 'tool_use') markers.push({ k: 'tool', id: b.id, name: b.name })
    }
  }

  // 2) Emit units: consecutive 'tool' markers collapse into one cluster unit.
  const units = []
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
  for (const m of markers) {
    if (m.k === 'tool') {
      if (!cluster) cluster = { id: m.id, tools: [] }
      cluster.tools.push(m.name)
    } else if (m.k === 'text') {
      flush()
      units.push({
        type: 'text',
        id: m.id,
        role: m.role,
        original: m.text,
        translation: '',
      })
    } else {
      // thinking breaks a cluster but is not itself an annotatable unit
      flush()
    }
  }
  flush()
  return units
}
