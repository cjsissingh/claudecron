# claudecron

Local-first Claude prompt scheduler with web UI. Schedules and runs Claude CLI
prompts on cron schedules, routing output to log/email/webhook.

## Commands

```bash
# Dev (two terminals required)
npm run dev                  # Backend on :3000
cd client && npm run dev     # Frontend on :5173 (proxies API to :3000)

# Build
npm run build                # Builds server (tsc) + client (vite)
npm start                    # Start production server (serves client/dist)

# Quality
npm run lint                 # ESLint (server + scripts only)
npm run format:check         # Prettier check
npm run typecheck            # tsc --noEmit for both server and client

# Other
npm run seed                 # Seed example prompts into DB
sqlite3 data/claudecron.db   # Inspect DB directly
```

## Architecture

- `server/` — Express + TypeScript backend (compiled to `dist/`)
- `client/` — React 18 + Vite + TypeScript frontend (built to `client/dist/`)
- `data/claudecron.db` — SQLite database (gitignored, auto-created on first run)
- `ecosystem.config.js` — pm2 config for production process management

### Server modules
- `server/index.ts` — Express entry, serves `client/dist/` in production
- `server/db.ts` — SQLite via better-sqlite3; `prompts`, `runs`, `config` tables
- `server/scheduler.ts` — node-cron job registry, syncs with DB
- `server/runner.ts` — Spawns Claude CLI as child process, streams output via SSE
- `server/router.ts` — Routes output to log/email/webhook; nodemailer for SMTP

### Client stack
- React 18 + TypeScript + Vite
- Tailwind CSS v4 (via `@tailwindcss/postcss`, not CDN)
- Radix UI primitives + shadcn-style components in `client/src/components/ui/`
- lucide-react for icons

## Gotchas

- **TypeScript throughout** — DEVELOPMENT.md references `.js` files but all source is `.ts`
- **Two separate `package.json`** — `npm install` at root + `cd client && npm install`; `npm run typecheck` covers both
- **DB is gitignored** — `data/` dir is in `.gitignore`; delete `data/claudecron.db` to reset schema
- **Client build path** — production server serves `client/dist/`; run `npm run build:client` after frontend changes
- **Claude CLI required at runtime** — path configured via Settings UI, defaults to `claude` in PATH
