import { Bot, User } from 'lucide-react'
import type { TimelineEvent, ToolCallEvent } from '../types'
import type { AnnotationIndex } from '../lib/annotations'
import { useI18n } from '../lib/i18n'
import Markdown from './Markdown'
import Thinking from './Thinking'
import ToolCluster from './ToolCluster'

function formatTime(ts?: string): string {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function MessageBlock({
  event,
  translation,
  targetLang,
  showTranslation,
}: {
  event: Extract<TimelineEvent, { kind: 'user-text' | 'assistant-text' }>
  translation?: string
  targetLang?: string
  showTranslation: boolean
}) {
  const { t } = useI18n()
  const isUser = event.kind === 'user-text'
  return (
    <div
      className={`event message ${isUser ? 'message-user' : 'message-assistant'}`}
      id={event.id}
    >
      <div className="message-head">
        <span className="message-role">
          {isUser ? <User size={14} /> : <Bot size={14} />}
          {isUser ? t('msg.user') : t('msg.assistant')}
        </span>
        {event.isSidechain && <span className="badge-sidechain">sidechain</span>}
        <span className="message-time">{formatTime(event.timestamp)}</span>
      </div>
      <div className="message-body">
        <Markdown text={event.text} />
        {showTranslation && translation && (
          <div className="translation">
            <div className="translation-label">
              {t('msg.translation')}
              {targetLang ? ` · ${targetLang}` : ''}
            </div>
            <Markdown text={translation} />
          </div>
        )}
      </div>
    </div>
  )
}

/** Group the flat event list, collapsing runs of consecutive tool calls. */
type Group =
  | { kind: 'single'; event: TimelineEvent }
  | { kind: 'cluster'; calls: ToolCallEvent[] }

function groupEvents(events: TimelineEvent[]): Group[] {
  const groups: Group[] = []
  let cluster: ToolCallEvent[] = []
  const flush = () => {
    if (cluster.length) {
      groups.push({ kind: 'cluster', calls: cluster })
      cluster = []
    }
  }
  for (const event of events) {
    if (event.kind === 'tool-call') {
      cluster.push(event)
    } else {
      flush()
      groups.push({ kind: 'single', event })
    }
  }
  flush()
  return groups
}

export default function Timeline({
  events,
  annotations,
  showTranslations,
}: {
  events: TimelineEvent[]
  annotations: AnnotationIndex
  showTranslations: boolean
}) {
  const groups = groupEvents(events)

  return (
    <div className="timeline">
      {groups.map((group, i) => {
        if (group.kind === 'cluster') {
          const summary = annotations.summaries.get(group.calls[0].toolUseId)
          return (
            <ToolCluster
              key={group.calls[0].id}
              calls={group.calls}
              summary={summary}
            />
          )
        }
        const event = group.event
        switch (event.kind) {
          case 'user-text':
          case 'assistant-text':
            return (
              <MessageBlock
                key={event.id}
                event={event}
                translation={event.uuid ? annotations.translations.get(event.uuid) : undefined}
                targetLang={annotations.targetLang}
                showTranslation={showTranslations}
              />
            )
          case 'thinking':
            return <Thinking key={event.id} event={event} />
          case 'system':
            return (
              <div className="event system" key={event.id} id={event.id}>
                <span className="system-label">⚙ system</span>
                <span className="system-text">{event.text}</span>
              </div>
            )
          default:
            return <span key={i} />
        }
      })}
    </div>
  )
}
