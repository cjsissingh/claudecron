# Development Guide

## Project Setup

### Prerequisites
- Node.js 18+ (check with `node --version`)
- npm (included with Node.js)
- Claude CLI installed and in PATH

### First-time Setup

```bash
git clone <repo-url>
cd claudecron
npm install
cd client && npm install && cd ..
```

### Running in Development

**Terminal 1 (Backend)**
```bash
npm run dev
# Runs on http://localhost:3000
```

**Terminal 2 (Frontend)**
```bash
cd client
npm run dev
# Runs on http://localhost:5173
# Proxies API calls to http://localhost:3000
```

Then open http://localhost:5173 in your browser.

## Architecture

### Backend (Express + Node.js)

**server/index.js**
- Express server with REST API
- Serves React build in production
- Initializes scheduler on startup

**server/db.js**
- SQLite database operations
- Schema: `prompts` and `runs` tables
- Config stored in `config` table

**server/scheduler.js**
- Uses node-cron to schedule jobs
- Maintains in-memory job registry
- Syncs with DB on changes

**server/runner.js**
- Spawns Claude CLI as child process
- Captures stdout/stderr
- Streams output via SSE
- Creates run records in DB

**server/router.js**
- Routes output to email/file/webhook
- Uses nodemailer for SMTP
- Formats output based on type

### Frontend (React 18 + Vite)

**client/src/App.jsx**
- Main app component
- Sidebar navigation
- Page routing

**client/src/components/**
- `PromptList.jsx` — Display and manage prompts
- `PromptEditor.jsx` — Create/edit prompts with test runner
- `RunHistory.jsx` — View past runs with output
- `Settings.jsx` — Configure Claude path and email

**client/index.html**
- Tailwind CSS from CDN
- Vite entry point

## Database Schema

### prompts table
```sql
CREATE TABLE prompts (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  prompt_text TEXT NOT NULL,
  schedule TEXT NOT NULL,
  output_type TEXT DEFAULT 'log',
  output_config TEXT,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### runs table
```sql
CREATE TABLE runs (
  id INTEGER PRIMARY KEY,
  prompt_id INTEGER NOT NULL,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at DATETIME,
  status TEXT DEFAULT 'running',
  output TEXT,
  error TEXT,
  FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
)
```

### config table
```sql
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT
)
```

## API Routes

All API routes return JSON.

### Prompts
- `GET /api/prompts` → Array of all prompts
- `POST /api/prompts` → Create new prompt
- `GET /api/prompts/:id` → Get single prompt
- `PUT /api/prompts/:id` → Update prompt
- `DELETE /api/prompts/:id` → Delete prompt

### Runs
- `POST /api/prompts/:id/run` → Trigger immediate run
- `GET /api/prompts/:id/runs` → Get run history (limit=50)
- `GET /api/runs/:id/stream` → SSE stream of live output

### Config
- `GET /api/config` → Get current config
- `PUT /api/config` → Update config

### Health
- `GET /api/health` → Server status

## Testing

### Manual Testing

1. **Create a prompt:**
   - Name: "Test Prompt"
   - Text: `echo "Hello from Claude"`
   - Schedule: `0 9 * * *`
   - Output: Log only

2. **Test run:**
   - Click "Test Run" button
   - Should show output streaming in real-time

3. **Test email:**
   - Configure SMTP in Settings
   - Change output type to Email
   - Add recipient email
   - Click "Test Run"
   - Check email inbox

4. **Test scheduling:**
   - Set schedule to run every minute: `* * * * *`
   - Wait 60 seconds
   - Check run history

### Database Testing

```bash
# Open SQLite CLI
sqlite3 data/claudecron.db

# View prompts
SELECT * FROM prompts;

# View runs
SELECT * FROM runs;

# View config
SELECT * FROM config;
```

## Building for Production

```bash
# Build React app
cd client
npm run build
cd ..

# Build creates client/dist/
# Server automatically serves this in production

# Start server
npm start
```

## Environment Variables

No environment variables required, but can be set:

```bash
NODE_ENV=production   # Use 'production'
PORT=3000            # Server port (default 3000)
```

## Common Issues & Solutions

### Claude CLI Not Found
```bash
# Test if Claude is installed
which claude
claude --version

# If not in PATH, configure full path in Settings
# Or set in environment:
export PATH="/usr/local/bin:$PATH"
```

### Database Locked Error
```bash
# Caused by multiple connections
# Solution: Ensure only one server instance
pm2 kill
pm2 start ecosystem.config.js
```

### Port Already in Use
```bash
# Find process on port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 npm start
```

### Vite Hot Reload Not Working
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Restart dev server
npm run dev
```

## Performance Tips

1. **Database optimization:**
   - Runs table can grow large; consider archiving old runs
   - Add index on `prompt_id` in runs table if needed

2. **Memory management:**
   - Each run spawns a child process
   - Long-running prompts hold output in memory
   - Consider streaming to file for very large outputs

3. **CPU optimization:**
   - Better-sqlite3 is synchronous; fine for <100 prompts
   - Cron jobs spread load naturally

## Debugging

### Backend Logs
```bash
# pm2 logs
pm2 logs claudecron

# Or tail directly
tail -f ~/.pm2/logs/claudecron-error.log
tail -f ~/.pm2/logs/claudecron-out.log
```

### Frontend Logs
```bash
# Browser console
# Open DevTools: F12 or Cmd+Option+I
# Check Console tab for errors
```

### Database Debugging
```bash
# Check DB file size
du -h data/claudecron.db

# Vacuum (optimize)
sqlite3 data/claudecron.db "VACUUM;"

# Check integrity
sqlite3 data/claudecron.db "PRAGMA integrity_check;"
```

## Code Style

- **JavaScript:** No linter configured; follow Airbnb style guide
- **React:** Functional components with hooks
- **CSS:** Tailwind utility classes via CDN
- **Database:** Prepared statements (better-sqlite3)

## Adding Features

### Adding a New Output Type

1. Update **server/router.js:**
   - Add case in `routeOutput()` function
   - Create handler function

2. Update **client/src/components/PromptEditor.jsx:**
   - Add output type option
   - Add config fields for new type

3. Test with `npm run dev` in both terminals

### Adding a New API Route

1. Add to **server/index.js:**
   ```javascript
   app.get('/api/new-endpoint', (req, res) => {
     // Handle request
     res.json({ /* response */ });
   });
   ```

2. Update **client/src/components/** to call it:
   ```javascript
   const res = await fetch('/api/new-endpoint');
   ```

### Adding Database Fields

1. Modify schema in **server/db.js:**
   ```javascript
   db.exec(`ALTER TABLE prompts ADD COLUMN new_field TEXT`);
   ```

2. Update queries that use the table

3. Delete `data/claudecron.db` to force fresh creation

## Deployment

### systemd Service
```ini
[Unit]
Description=claudecron
After=network.target

[Service]
Type=simple
User=claudecron
WorkingDirectory=/opt/claudecron
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
Environment="NODE_ENV=production"
Environment="PORT=3000"

[Install]
WantedBy=multi-user.target
```

### Docker
See README.md for Docker setup.

### Cloud Platforms

**Heroku:** Add Procfile
```
web: npm start
```

**Railway/Render:** Just push code, they detect Node.js

**VPS:** Use systemd service + reverse proxy (nginx/Caddy)

## License

MIT - See LICENSE file
