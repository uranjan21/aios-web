import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import { initAnalytics } from '@ct/shared/lib/analytics'

// No-op unless VITE_SENTRY_DSN / VITE_POSTHOG_KEY are set.
initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
