import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { NuqsAdapter } from 'nuqs/adapters/react'
import './index.css'
import App from './App.tsx'
import { ToastProvider, LiveAnnouncerProvider } from '@/components/ui'
import { E2ETestHooks } from '@/components/debug'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NuqsAdapter>
      <LiveAnnouncerProvider>
        <ToastProvider>
          <App />
          {import.meta.env.DEV && <E2ETestHooks />}
        </ToastProvider>
      </LiveAnnouncerProvider>
    </NuqsAdapter>
  </StrictMode>
)
