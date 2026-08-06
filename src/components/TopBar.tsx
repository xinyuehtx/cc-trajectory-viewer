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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </div>
    </header>
  )
}
