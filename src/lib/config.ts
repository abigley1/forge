export const config = {
  debug: import.meta.env.VITE_DEBUG ?? '',
  enableExperimental: import.meta.env.VITE_ENABLE_EXPERIMENTAL === 'true',
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  mode: import.meta.env.MODE,
} as const

export type Config = typeof config
