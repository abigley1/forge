import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { NuqsAdapter } from 'nuqs/adapters/react'
import './index.css'
import App from './App.tsx'
import { ToastProvider } from '@/components/ui'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NuqsAdapter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </NuqsAdapter>
  </StrictMode>
)
