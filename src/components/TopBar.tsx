import { ListTree, Moon, Route, Sun, GitCompare } from 'lucide-react'
import { useI18n, type Lang } from '../lib/i18n'
import type { Theme } from '../lib/theme'

const GITHUB_URL = 'https://github.com/xinyuehtx/cc-trajectory-viewer'

export type Tab = 'timeline' | 'diffs'

export default function TopBar({
  tab,
  onTabChange,
  editCount,
  theme,
  onToggleTheme,
}: {
  tab: Tab
  onTabChange: (t: Tab) => void
  editCount: number
  theme: Theme
  onToggleTheme: () => void
}) {
  const { t, lang, setLang } = useI18n()

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="topbar-logo">
          <Route size={20} strokeWidth={2.2} />
        </span>
        <nav className="tabbar" role="tablist">
          <button
            className={`tab${tab === 'timeline' ? ' tab-active' : ''}`}
            onClick={() => onTabChange('timeline')}
          >
            <ListTree size={15} />
            {t('tab.timeline')}
          </button>
          <button
            className={`tab${tab === 'diffs' ? ' tab-active' : ''}`}
            onClick={() => onTabChange('diffs')}
          >
            <GitCompare size={15} />
            {t('tab.diffs')} {editCount > 0 && <span className="tab-count">{editCount}</span>}
          </button>
        </nav>
      </div>

      <div className="topbar-right">
        <div className="segmented" role="group" aria-label={t('sidebar.language')}>
          {(['en', 'zh'] as Lang[]).map((l) => (
            <button key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)}>
              {l === 'en' ? 'EN' : '中'}
            </button>
          ))}
        </div>
        <button
          className="icon-button"
          onClick={onToggleTheme}
          title={theme === 'dark' ? t('sidebar.themeLight') : t('sidebar.themeDark')}
          aria-label={theme === 'dark' ? t('sidebar.themeLight') : t('sidebar.themeDark')}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <a
          className="icon-button"
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer noopener"
          title="GitHub"
          aria-label="GitHub"
        >
          <Github size={16} />
        </a>
      </div>
    </header>
  )
}
