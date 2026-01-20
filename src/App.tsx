import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import { cn } from '@/lib/utils'
import type { AppConfig } from '@/types'

const config: AppConfig = { name: 'Forge', version: '0.0.1' }

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-8">
      <div className="flex gap-8">
        <a href="https://vite.dev" target="_blank" rel="noopener noreferrer">
          <img
            src={viteLogo}
            className="h-24 p-6 transition-all duration-200 hover:drop-shadow-lg"
            alt="Vite logo"
          />
        </a>
        <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
          <img
            src={reactLogo}
            className="h-24 p-6 transition-all duration-200 [animation-duration:20s] hover:drop-shadow-lg motion-safe:animate-spin"
            alt="React logo"
          />
        </a>
      </div>
      <h1 className="mt-8 text-4xl font-bold">{config.name}</h1>
      <div className="mt-8 rounded-lg bg-gray-100 p-8 dark:bg-gray-800">
        <button
          onClick={() => setCount((count) => count + 1)}
          className={cn(
            'rounded-lg border border-transparent px-5 py-2.5',
            'bg-gray-900 text-white dark:bg-white dark:text-gray-900',
            'transition-colors duration-200',
            'hover:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none'
          )}
        >
          count is {count}
        </button>
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Edit{' '}
          <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">
            src/App.tsx
          </code>{' '}
          and save to test HMR
        </p>
      </div>
      <p className="mt-8 text-gray-500">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  )
}

export default App
