import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Lang = 'en' | 'zh'

/** UI string tables. `{name}` placeholders are filled by t()'s vars argument. */
const messages: Record<Lang, Record<string, string>> = {
  en: {
    'tab.timeline': 'Timeline',
    'tab.diffs': 'Diffs',

    'sidebar.openAnother': '← Open another file',
    'sidebar.session': 'Session',
    'sidebar.stats': 'Stats',
    'sidebar.modifiedFiles': 'Modified files',
    'sidebar.noEdits': 'No file edits in this session.',
    'sidebar.annotations': 'Annotations',
    'sidebar.annCounts': '{s} summaries · {t} translations',
    'sidebar.showTranslations': 'Show translations',
    'sidebar.noAnnotations':
      'No annotations loaded. Generate them with the view-trajectory skill, or load a .trajv.json file.',
    'sidebar.loadAnnotations': 'Load annotations…',
    'sidebar.parseWarning': '⚠ {n} line(s) could not be parsed.',
    'sidebar.theme': 'Theme',
    'sidebar.language': 'Language',
    'sidebar.themeLight': 'Light',
    'sidebar.themeDark': 'Dark',

    'stat.user': 'user',
    'stat.assistant': 'assistant',
    'stat.toolCalls': 'tool calls',
    'stat.outTokens': 'out tokens',
    'stat.inTokens': 'in tokens',
    'stat.cacheRead': 'cache read',

    'diffs.changes': '{n} change',
    'diffs.changes_plural': '{n} changes',
    'diffs.unified': 'Unified',
    'diffs.split': 'Split',
    'diffs.wrap': 'Wrap',
    'diffs.noEdits': 'No file edits in this session.',
    'diffs.version': 'v{n}',
    'diffs.externalChange': 'external change detected',
    'diffs.edits': '{n} edit',
    'diffs.edits_plural': '{n} edits',

    'tool.showInput': 'Show input',
    'tool.hideInput': 'Hide input',
    'tool.viewDiff': 'view diff →',

    'result.error': 'error',
    'result.result': 'result',
    'result.images': '{n} image(s)',
    'result.showLess': 'Show less',
    'result.showMore': 'Show {n} more chars',

    'thinking.label': 'Thinking',

    'cluster.calls': '{n} tool call',
    'cluster.calls_plural': '{n} tool calls',

    'msg.user': 'User',
    'msg.assistant': 'Assistant',
    'msg.translation': 'Translation',

    'uploader.title': 'Claude Code Trajectory Viewer',
    'uploader.tagline':
      'Drop a .jsonl session file to visualize the timeline, tool calls, and code diffs.',
    'uploader.drop': 'Drop a trajectory here',
    'uploader.browse': 'or click to browse',
    'uploader.hintLocation':
      'Session files live under ~/.claude/projects/<project>/<sessionId>.jsonl.',
    'uploader.hintCli': 'From a terminal you can also run',
    'uploader.emptyFile': 'The file is empty.',
    'uploader.noMessages':
      'No renderable messages found — is this a Claude Code .jsonl trajectory?',
  },
  zh: {
    'tab.timeline': '时间线',
    'tab.diffs': '差异',

    'sidebar.openAnother': '← 打开其他文件',
    'sidebar.session': '会话',
    'sidebar.stats': '统计',
    'sidebar.modifiedFiles': '修改的文件',
    'sidebar.noEdits': '本次会话没有文件改动。',
    'sidebar.annotations': '标注',
    'sidebar.annCounts': '{s} 条摘要 · {t} 条译文',
    'sidebar.showTranslations': '显示译文',
    'sidebar.noAnnotations':
      '未加载标注。可用 view-trajectory 技能生成，或加载 .trajv.json 文件。',
    'sidebar.loadAnnotations': '加载标注…',
    'sidebar.parseWarning': '⚠ {n} 行无法解析。',
    'sidebar.theme': '主题',
    'sidebar.language': '语言',
    'sidebar.themeLight': '浅色',
    'sidebar.themeDark': '深色',

    'stat.user': '用户',
    'stat.assistant': '助手',
    'stat.toolCalls': '工具调用',
    'stat.outTokens': '输出 token',
    'stat.inTokens': '输入 token',
    'stat.cacheRead': '缓存读取',

    'diffs.changes': '{n} 处改动',
    'diffs.changes_plural': '{n} 处改动',
    'diffs.unified': '统一视图',
    'diffs.split': '分栏视图',
    'diffs.wrap': '自动换行',
    'diffs.noEdits': '本次会话没有文件改动。',
    'diffs.version': '第 {n} 版',
    'diffs.externalChange': '检测到外部改动',
    'diffs.edits': '{n} 次编辑',
    'diffs.edits_plural': '{n} 次编辑',

    'tool.showInput': '显示输入',
    'tool.hideInput': '隐藏输入',
    'tool.viewDiff': '查看差异 →',

    'result.error': '错误',
    'result.result': '结果',
    'result.images': '{n} 张图片',
    'result.showLess': '收起',
    'result.showMore': '展开剩余 {n} 个字符',

    'thinking.label': '思考',

    'cluster.calls': '{n} 次工具调用',
    'cluster.calls_plural': '{n} 次工具调用',

    'msg.user': '用户',
    'msg.assistant': '助手',
    'msg.translation': '译文',

    'uploader.title': 'Claude Code 轨迹查看器',
    'uploader.tagline': '拖入 .jsonl 会话文件，可视化时间线、工具调用与代码差异。',
    'uploader.drop': '将轨迹文件拖到这里',
    'uploader.browse': '或点击选择文件',
    'uploader.hintLocation':
      '会话文件位于 ~/.claude/projects/<project>/<sessionId>.jsonl。',
    'uploader.hintCli': '你也可以在终端运行',
    'uploader.emptyFile': '文件为空。',
    'uploader.noMessages':
      '未找到可渲染的消息 —— 这是一个 Claude Code 的 .jsonl 轨迹文件吗？',
  },
}

const STORAGE_KEY = 'trajv-lang'

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'zh') return saved
  } catch {
    /* ignore */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'en'
  return nav && nav.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export type TFunc = (key: string, vars?: Record<string, string | number>) => string

interface I18nApi {
  lang: Lang
  setLang: (l: Lang) => void
  t: TFunc
}

const I18nContext = createContext<I18nApi>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang)

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
  }, [])

  const t = useCallback<TFunc>(
    (key, vars) => {
      const table = messages[lang]
      let str = table[key] ?? messages.en[key] ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
        }
      }
      return str
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nApi {
  return useContext(I18nContext)
}
