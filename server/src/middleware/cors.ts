import cors from 'cors'

/**
 * Create CORS middleware configured for Tailscale hostnames.
 *
 * Allows requests from:
 * - *.ts.net (Tailscale MagicDNS domains)
 * - localhost (for development)
 *
 * The TAILSCALE_HOSTNAME env var can be used to add a specific hostname.
 */
export function createCorsMiddleware() {
  const tailscaleHostname = process.env.TAILSCALE_HOSTNAME

  return cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., same-origin, curl, mobile apps)
      if (!origin) {
        callback(null, true)
        return
      }

      // Allow localhost for development
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('[::1]')
      ) {
        callback(null, true)
        return
      }

      // Allow Tailscale MagicDNS domains (*.ts.net)
      if (origin.endsWith('.ts.net')) {
        callback(null, true)
        return
      }

      // Allow specific Tailscale hostname if configured
      if (tailscaleHostname && origin.includes(tailscaleHostname)) {
        callback(null, true)
        return
      }

      // Reject other origins
      callback(new Error('Not allowed by CORS'))
    },
    credentials: true,
    methods: ['GET', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
}
