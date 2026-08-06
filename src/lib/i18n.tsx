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

    'subagent.label': 'Subagent',
    'subagent.steps': '{n} steps',

    'msg.user': 'User',
    'msg.assistant': 'Assistant',
    'msg.translation': 'Translation',
    'msg.executed': 'tool execution',

    'filter.title': 'Filters',
    'filter.subagents': 'Show subagent steps',

    'uploader.title': 'Claude Code Trajectory Viewer',
    'uploader.tagline':
      'Drop a .jsonl session file to visualize the timeline, tool calls, and code diffs.',
    'uploader.drop': 'Drop a trajectory here',
    'uploader.browse': 'or click to browse',
    'uploader.hintLocation':
      'Session files live under ~/.claude/projects/<project>/<sessionId>.jsonl.',
    'uploader.hintCli': 'From a terminal you can also run',
    'uploader.demoAlt': 'Interface demo',
    'uploader.feat1': 'Timeline of prompts, thinking & clustered tool calls',
    'uploader.feat2': 'Per-file aggregated red / green code diffs',
    'uploader.feat3': 'Dark / light themes · English / 中文',
    'uploader.sister': 'Sister project',
    'uploader.sisterDesc': 'a viewer for Harbor ATIF trajectories',
    'uploader.harborAbout': 'Harbor = agent evaluation framework',
    'uploader.emptyFile': 'The file is empty.',
    'uploader.noMessages':
      'No renderable messages found — is this a Claude Code .jsonl trajectory?',

    'landing.nav.features': 'Features',
    'landing.nav.quickstart': 'Quick start',
    'landing.nav.demo': 'Live demo',
    'landing.backHome': 'Home',
    'landing.hero.badge': 'Open source · Runs in your browser',
    'landing.hero.title': 'See what Claude Code did — turn by turn.',
    'landing.hero.subtitle':
      'Visualize a Claude Code trajectory (.jsonl session): a readable timeline of prompts, thinking and tool calls, plus per-file red / green code diffs. Open from the CLI, or drop a file in the browser.',
    'landing.hero.tryDemo': 'Try the live demo',
    'landing.hero.viewGithub': 'View on GitHub',
    'landing.hero.copied': 'Copied!',
    'landing.features.title': 'Everything in one view',
    'landing.features.subtitle': 'No install required to explore — the live demo runs entirely client-side.',
    'landing.feat.timeline.title': 'Readable timeline',
    'landing.feat.timeline.desc':
      'Prompts, thinking and clustered tool calls laid out in order, so a long session reads like a story.',
    'landing.feat.tools.title': 'Tool calls, decoded',
    'landing.feat.tools.desc':
      'Inputs and results for each tool are grouped and formatted — no more scrolling raw JSON.',
    'landing.feat.diffs.title': 'Per-file code diffs',
    'landing.feat.diffs.desc':
      'Every edit aggregated into red / green diffs per file, with unified and split views.',
    'landing.feat.theme.title': 'Themes & i18n',
    'landing.feat.theme.desc':
      'Dark / light themes and English / 中文, remembered across sessions.',
    'landing.quickstart.title': 'Quick start',
    'landing.quickstart.subtitle': 'Point it at any Claude Code session file — zero config.',
    'landing.quickstart.cliNote': 'Open a trajectory straight from your terminal:',
    'landing.quickstart.browserNote': 'Prefer the browser? Open the live demo and drop a .jsonl file in.',
    'landing.quickstart.openDemo': 'Open the live demo →',
    'landing.footer.tagline': 'Visualize Claude Code trajectories in the browser.',
    'landing.footer.github': 'GitHub',
    'landing.footer.npm': 'npm',
    'landing.footer.demo': 'Live demo',
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

    'subagent.label': '子智能体',
    'subagent.steps': '{n} 步',

    'msg.user': '用户',
    'msg.assistant': '助手',
    'msg.translation': '译文',
    'msg.executed': '工具执行',

    'filter.title': '过滤',
    'filter.subagents': '显示子代理步骤',

    'uploader.title': 'Claude Code 轨迹查看器',
    'uploader.tagline': '拖入 .jsonl 会话文件，可视化时间线、工具调用与代码差异。',
    'uploader.drop': '将轨迹文件拖到这里',
    'uploader.browse': '或点击选择文件',
    'uploader.hintLocation':
      '会话文件位于 ~/.claude/projects/<project>/<sessionId>.jsonl。',
    'uploader.hintCli': '你也可以在终端运行',
    'uploader.demoAlt': '界面演示',
    'uploader.feat1': '提示词、思考与聚合工具调用的时间线',
    'uploader.feat2': '按文件聚合的红 / 绿代码差异',
    'uploader.feat3': '深色 / 浅色主题 · 中文 / English',
    'uploader.sister': '姊妹项目',
    'uploader.sisterDesc': 'Harbor ATIF 轨迹查看器',
    'uploader.harborAbout': 'Harbor = Agent 评估框架',
    'uploader.emptyFile': '文件为空。',
    'uploader.noMessages':
      '未找到可渲染的消息 —— 这是一个 Claude Code 的 .jsonl 轨迹文件吗？',

    'landing.nav.features': '功能',
    'landing.nav.quickstart': '快速开始',
    'landing.nav.demo': '在线演示',
    'landing.backHome': '返回首页',
    'landing.hero.badge': '开源 · 浏览器中运行',
    'landing.hero.title': '看清 Claude Code 的每一步。',
    'landing.hero.subtitle':
      '可视化 Claude Code 的轨迹（.jsonl 会话）：以清晰的时间线呈现提示词、思考与工具调用，并按文件展示红 / 绿代码差异。可从命令行打开，也可直接在浏览器拖入文件。',
    'landing.hero.tryDemo': '试用在线演示',
    'landing.hero.viewGithub': '在 GitHub 查看',
    'landing.hero.copied': '已复制！',
    'landing.features.title': '所需的一切，尽在一屏',
    'landing.features.subtitle': '无需安装即可体验 —— 在线演示完全在浏览器本地运行。',
    'landing.feat.timeline.title': '清晰的时间线',
    'landing.feat.timeline.desc': '提示词、思考与聚合的工具调用按序排列，再长的会话也能像故事一样读下来。',
    'landing.feat.tools.title': '工具调用一目了然',
    'landing.feat.tools.desc': '每个工具的输入与结果都被归组并格式化，不必再翻阅原始 JSON。',
    'landing.feat.diffs.title': '按文件的代码差异',
    'landing.feat.diffs.desc': '所有编辑按文件聚合为红 / 绿差异，支持统一视图与分栏视图。',
    'landing.feat.theme.title': '主题与多语言',
    'landing.feat.theme.desc': '深色 / 浅色主题、中文 / English，并跨会话记住你的选择。',
    'landing.quickstart.title': '快速开始',
    'landing.quickstart.subtitle': '指向任意 Claude Code 会话文件 —— 零配置。',
    'landing.quickstart.cliNote': '直接在终端打开一个轨迹：',
    'landing.quickstart.browserNote': '更喜欢浏览器？打开在线演示并拖入一个 .jsonl 文件即可。',
    'landing.quickstart.openDemo': '打开在线演示 →',
    'landing.footer.tagline': '在浏览器中可视化 Claude Code 轨迹。',
    'landing.footer.github': 'GitHub',
    'landing.footer.npm': 'npm',
    'landing.footer.demo': '在线演示',
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
