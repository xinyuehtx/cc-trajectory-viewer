import React from 'react'
import ReactDOM from 'react-dom/client'
import Root from './Root'
import { I18nProvider } from './lib/i18n'
import { applyTheme, resolveTheme } from './lib/theme'
import './index.css'

// The inline script in index.html sets the theme pre-paint; re-assert here so
// the attribute is present even when the app is embedded without that script.
applyTheme(resolveTheme())

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
      <Root />
    </I18nProvider>
  </React.StrictMode>,
)
