import { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight,
  Check,
  Copy,
  FileDiff,
  Languages,
  ListTree,
  Moon,
  Route,
  Sun,
  Wrench,
} from 'lucide-react'
import { useI18n, type Lang } from '../lib/i18n'
import { applyTheme, resolveTheme, saveTheme, type Theme } from '../lib/theme'

const GITHUB_URL = 'https://github.com/xinyuehtx/cc-trajectory-viewer'
const NPM_URL = 'https://www.npmjs.com/package/@xinyuehtx/cc-trajectory-viewer'
const CLI_CMD = 'npx @xinyuehtx/cc-trajectory-viewer session.jsonl'

const GithubIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
)

export default function Landing() {
  const { t, lang, setLang } = useI18n()
  const [theme, setTheme] = useState<Theme>(() => resolveTheme())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    applyTheme(theme)
    saveTheme(theme)
  }, [theme])

  const toggleTheme = useCallback(
    () => setTheme((p) => (p === 'dark' ? 'light' : 'dark')),
    [],
  )

  const copyCmd = useCallback(() => {
    navigator.clipboard?.writeText(CLI_CMD).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      },
      () => {},
    )
  }, [])

  const features = [
    { icon: ListTree, key: 'timeline' },
    { icon: Wrench, key: 'tools' },
    { icon: FileDiff, key: 'diffs' },
    { icon: Languages, key: 'theme' },
  ] as const

  return (
    <div className="landing">
      <header className="landing-nav">
        <a className="landing-brand" href="#/">
          <span className="landing-logo">
            <Route size={20} strokeWidth={2.2} />
          </span>
          Trajectory Viewer
        </a>
        <nav className="landing-nav-links">
          <a href="#features">{t('landing.nav.features')}</a>
          <a href="#quickstart">{t('landing.nav.quickstart')}</a>
        </nav>
        <div className="landing-nav-actions">
          <div className="segmented" role="group" aria-label="language">
            {(['en', 'zh'] as Lang[]).map((l) => (
              <button key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)}>
                {l === 'en' ? 'EN' : '中'}
              </button>
            ))}
          </div>
          <button
            className="icon-button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('sidebar.themeLight') : t('sidebar.themeDark')}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <a
            className="icon-button"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub"
          >
            <GithubIcon />
          </a>
          <a className="landing-btn landing-btn-primary landing-nav-demo" href="#/live-demo">
            {t('landing.nav.demo')}
          </a>
        </div>
      </header>

      <section className="landing-hero">
        <span className="landing-badge">{t('landing.hero.badge')}</span>
        <h1 className="landing-title">{t('landing.hero.title')}</h1>
        <p className="landing-subtitle">{t('landing.hero.subtitle')}</p>
        <div className="landing-cta">
          <a className="landing-btn landing-btn-primary landing-btn-lg" href="#/live-demo">
            {t('landing.hero.tryDemo')}
            <ArrowRight size={17} />
          </a>
          <a
            className="landing-btn landing-btn-ghost landing-btn-lg"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
          >
            <GithubIcon size={17} />
            {t('landing.hero.viewGithub')}
          </a>
        </div>
        <button className="landing-cmd" onClick={copyCmd} title={CLI_CMD}>
          <span className="landing-cmd-prompt">$</span>
          <code>{CLI_CMD}</code>
          <span className="landing-cmd-copy">
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? t('landing.hero.copied') : ''}
          </span>
        </button>
      </section>

      <section className="landing-section" id="features">
        <h2 className="landing-h2">{t('landing.features.title')}</h2>
        <p className="landing-section-sub">{t('landing.features.subtitle')}</p>
        <div className="landing-grid">
          {features.map(({ icon: Icon, key }) => (
            <div className="landing-card" key={key}>
              <span className="landing-card-icon">
                <Icon size={20} />
              </span>
              <h3>{t(`landing.feat.${key}.title`)}</h3>
              <p>{t(`landing.feat.${key}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="quickstart">
        <h2 className="landing-h2">{t('landing.quickstart.title')}</h2>
        <p className="landing-section-sub">{t('landing.quickstart.subtitle')}</p>
        <div className="landing-qs">
          <p className="landing-qs-note">{t('landing.quickstart.cliNote')}</p>
          <button className="landing-cmd landing-cmd-block" onClick={copyCmd} title={CLI_CMD}>
            <span className="landing-cmd-prompt">$</span>
            <code>{CLI_CMD}</code>
            <span className="landing-cmd-copy">
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </span>
          </button>
          <p className="landing-qs-note">{t('landing.quickstart.browserNote')}</p>
          <a className="landing-btn landing-btn-primary" href="#/live-demo">
            {t('landing.quickstart.openDemo')}
          </a>
        </div>
      </section>

      <footer className="landing-footer">
        <span className="landing-logo">
          <Route size={18} strokeWidth={2.2} />
        </span>
        <p>{t('landing.footer.tagline')}</p>
        <nav className="landing-footer-links">
          <a href="#/live-demo">{t('landing.footer.demo')}</a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
            {t('landing.footer.github')}
          </a>
          <a href={NPM_URL} target="_blank" rel="noreferrer noopener">
            {t('landing.footer.npm')}
          </a>
        </nav>
      </footer>
    </div>
  )
}
