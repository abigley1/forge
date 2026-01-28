# Forge Home Assistant Add-on

Personal project brainstorming and tracking tool for hardware/engineering projects.

## Installation Methods

### Method 1: Home Assistant Add-on Store (Recommended)

1. In Home Assistant, go to **Settings > Add-ons > Add-on Store**
2. Click the **⋮** menu (top right) and select **Repositories**
3. Add the repository URL: `https://github.com/yourusername/forge`
4. Click **Add**, then close the dialog
5. Find **Forge** in the add-on list and click it
6. Click **Install**
7. After installation, click **Start**
8. Enable **Show in sidebar** for easy access

### Method 2: Docker Compose (Local Testing)

For testing the Docker build locally before deploying to Home Assistant:

```bash
# Build and start
docker-compose up --build

# Access the app
open http://localhost:8099

# Stop
docker-compose down

# Stop and remove data
docker-compose down -v
```

### Method 3: Manual Docker

```bash
# Build the image
docker build -f homeassistant/Dockerfile -t forge:local .

# Run the container
docker run -d \
  --name forge \
  -p 8099:8099 \
  -v forge_data:/data \
  forge:local

# Check health
curl http://localhost:8099/api/health

# View logs
docker logs -f forge

# Stop
docker stop forge && docker rm forge
```

## Accessing Forge

### Via Tailscale (Primary/Recommended)

Access directly via your Tailscale network:

```
http://your-ha-hostname.tail12345.ts.net:8099
```

Benefits:
- Works from any device on your Tailnet (MacBook, iPhone, etc.)
- No Home Assistant authentication required (Tailscale handles auth)
- Full native browser experience

To find your Tailscale hostname:
1. Open the Tailscale admin console
2. Find your Home Assistant device
3. Copy the MagicDNS name (e.g., `ha-green.tail12345.ts.net`)

### Via Home Assistant Sidebar

1. Click **Forge** in the Home Assistant sidebar
2. Uses Home Assistant's built-in authentication

## Configuration

### Add-on Options

| Option | Description |
|--------|-------------|
| `tailscale_hostname` | Your Tailscale hostname for CORS (optional, only needed if Tailscale access doesn't work) |

### Environment Variables (Advanced)

These are set automatically by the add-on but can be customized:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8099` | Server port |
| `FORGE_DATA_DIR` | `/data` | Data directory |
| `FORGE_DB_PATH` | `/data/forge.sqlite` | SQLite database path |

## Data Storage

Your project data is stored in `/data` inside the container, which maps to Home Assistant's persistent add-on storage. This means:

- Data survives add-on updates
- Data survives Home Assistant restarts
- You can backup data via Home Assistant's backup system

## Updating

When a new version is available:

1. Home Assistant will show a notification
2. Go to **Settings > Add-ons > Forge**
3. Click **Update**

Your data is preserved during updates.

## Troubleshooting

### Add-on won't start

Check the logs:
1. Go to **Settings > Add-ons > Forge**
2. Click the **Log** tab
3. Look for error messages

### CORS errors when accessing via Tailscale

If you see CORS errors in browser console:
1. Go to add-on configuration
2. Set `tailscale_hostname` to your Tailscale hostname (e.g., `ha-green.tail12345.ts.net`)
3. Restart the add-on

### Can't connect to server

1. Verify the add-on is running (green indicator)
2. Check if port 8099 is accessible: `curl http://your-ha:8099/api/health`
3. Check firewall settings on your network

### Database errors

If the database becomes corrupted:
1. Stop the add-on
2. SSH into Home Assistant
3. Remove the database: `rm /addon_configs/local_forge/forge.sqlite`
4. Start the add-on (a new database will be created)

Note: This will delete all your project data.

## Development

To build locally for development:

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Run frontend dev server
npm run dev

# Run backend server (separate terminal)
cd server && npm run dev
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Home Assistant                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │                  Forge Add-on                      │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │           Node.js Express Server            │  │  │
│  │  │  ┌─────────────┐   ┌──────────────────┐   │  │  │
│  │  │  │   REST API  │   │  Static Files    │   │  │  │
│  │  │  │  /api/*     │   │  (Vite build)    │   │  │  │
│  │  │  └─────────────┘   └──────────────────┘   │  │  │
│  │  │         │                                    │  │  │
│  │  │  ┌─────────────┐                            │  │  │
│  │  │  │   SQLite    │                            │  │  │
│  │  │  │  Database   │                            │  │  │
│  │  │  └─────────────┘                            │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │              ↑               ↑                     │  │
│  │         Port 8099       Port 8099                 │  │
│  └───────────────────────────────────────────────────┘  │
│                ↑                   ↑                     │
│           HA Ingress          Direct Access              │
│          (sidebar)           (Tailscale)                 │
└─────────────────────────────────────────────────────────┘
```
