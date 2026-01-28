import cors from 'cors'

/**
 * Check if an origin is a private/local network address
 */
function isPrivateNetwork(origin: string): boolean {
  // Match private IP ranges, Tailscale CGNAT, and local hostnames
  const privatePatterns = [
    /^https?:\/\/192\.168\.\d+\.\d+/, // 192.168.x.x
    /^https?:\/\/10\.\d+\.\d+\.\d+/, // 10.x.x.x
    /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/, // 172.16-31.x.x
    /^https?:\/\/100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+/, // 100.64-127.x.x (Tailscale CGNAT)
    /^https?:\/\/homeassistant\.local/, // mDNS name
    /^https?:\/\/[^/]+\.local(:\d+)?/, // Any .local mDNS
  ]
  return privatePatterns.some((pattern) => pattern.test(origin))
}

/**
 * Create CORS middleware configured for local and Tailscale access.
 *
 * Allows requests from:
 * - localhost (for development)
 * - Private network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
 * - .local mDNS hostnames (e.g., homeassistant.local)
 * - *.ts.net (Tailscale MagicDNS domains)
 * - Specific TAILSCALE_HOSTNAME if configured
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

      // Allow private network addresses (LAN access)
      if (isPrivateNetwork(origin)) {
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
}
