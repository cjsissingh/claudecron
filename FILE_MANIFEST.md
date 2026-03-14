# File Manifest

Complete list of all files in the claudecron project.

## Documentation (5 files)

| File | Size | Purpose |
|------|------|---------|
| `START_HERE.md` | 2.5K | Entry point - read this first |
| `QUICK_START.md` | 3.4K | 5-minute setup guide |
| `README.md` | 9.9K | Full documentation, examples, troubleshooting |
| `DEVELOPMENT.md` | 7.3K | Development guide, architecture, API docs |
| `PROJECT_SUMMARY.md` | 7.3K | Technical overview and project summary |

## Root Config (4 files)

| File | Purpose |
|------|---------|
| `package.json` | Root dependencies: express, better-sqlite3, node-cron, nodemailer |
| `ecosystem.config.js` | pm2 configuration for process management |
| `install.sh` | One-command installation and setup script |
| `.nvmrc` | Node version specification (18) |
| `.gitignore` | Git ignore patterns |
| `LICENSE` | MIT License |

## Backend - Server (5 files, 940 lines)

| File | Lines | Purpose |
|------|-------|---------|
| `server/index.js` | 288 | Express server, REST API routes, startup |
| `server/db.js` | 192 | SQLite database, schema, CRUD operations |
| `server/scheduler.js` | 103 | node-cron job management and scheduling |
| `server/runner.js` | 137 | Claude CLI execution, output streaming, SSE |
| `server/router.js` | 220 | Output routing: email, file, webhook |

### Server Features
- ✅ Express REST API
- ✅ SQLite with better-sqlite3
- ✅ node-cron scheduling
- ✅ Child process management
- ✅ Server-sent events (SSE) streaming
- ✅ Email via nodemailer
- ✅ File and webhook routing
- ✅ Error handling and logging

## Frontend - React (6 files, 1029 lines)

| File | Lines | Purpose |
|------|-------|---------|
| `client/src/main.jsx` | 9 | React entry point |
| `client/src/App.jsx` | 191 | Main app component, navigation, state |
| `client/src/components/PromptList.jsx` | 135 | List, toggle, run prompts |
| `client/src/components/PromptEditor.jsx` | 309 | Create/edit with live test output |
| `client/src/components/RunHistory.jsx` | 158 | View past runs with output |
| `client/src/components/Settings.jsx` | 227 | Configure Claude path and email |

### Frontend Features
- ✅ React 18 with hooks
- ✅ Vite build system
- ✅ Tailwind CSS (CDN)
- ✅ Real-time output streaming via SSE
- ✅ Form validation
- ✅ Responsive design
- ✅ Settings management
- ✅ Run history browser

## Frontend - Build (3 files)

| File | Purpose |
|------|---------|
| `client/index.html` | HTML entry point, Tailwind CDN |
| `client/package.json` | React, React-DOM, Vite dependencies |
| `client/vite.config.js` | Vite build config, dev proxy |

## Scripts (1 file)

| File | Purpose |
|------|---------|
| `scripts/seed.js` | Populate DB with 5 example prompts |

## Config (1 file)

| File | Purpose |
|------|---------|
| `config/config.json` | Default configuration template |

## Database Schema

### prompts table
```
id (INTEGER PRIMARY KEY)
name (TEXT UNIQUE NOT NULL)
prompt_text (TEXT NOT NULL)
schedule (TEXT NOT NULL)
output_type (TEXT)
output_config (TEXT)
enabled (INTEGER)
created_at (DATETIME)
updated_at (DATETIME)
```

### runs table
```
id (INTEGER PRIMARY KEY)
prompt_id (INTEGER NOT NULL) [FK]
started_at (DATETIME)
finished_at (DATETIME)
status (TEXT)
output (TEXT)
error (TEXT)
```

### config table
```
key (TEXT PRIMARY KEY)
value (TEXT)
```

## Directory Tree

```
claudecron/
├── README.md                      (9.9K)
├── QUICK_START.md                 (3.4K)
├── DEVELOPMENT.md                 (7.3K)
├── PROJECT_SUMMARY.md             (7.3K)
├── START_HERE.md                  (2.5K)
├── FILE_MANIFEST.md               (this file)
├── LICENSE                        (MIT)
├── .gitignore
├── .nvmrc                         (node 18)
├── package.json                   (root deps)
├── ecosystem.config.js            (pm2 config)
├── install.sh                     (setup script)
│
├── server/
│   ├── index.js                   (288 lines)
│   ├── db.js                      (192 lines)
│   ├── scheduler.js               (103 lines)
│   ├── runner.js                  (137 lines)
│   └── router.js                  (220 lines)
│
├── client/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx               (9 lines)
│       ├── App.jsx                (191 lines)
│       └── components/
│           ├── PromptList.jsx     (135 lines)
│           ├── PromptEditor.jsx   (309 lines)
│           ├── RunHistory.jsx     (158 lines)
│           └── Settings.jsx       (227 lines)
│
├── scripts/
│   └── seed.js                    (populate examples)
│
└── config/
    └── config.json                (default config)
```

## File Statistics

| Metric | Value |
|--------|-------|
| Total Files | 27 |
| Total Size | 156K |
| Documentation Files | 5 |
| Source Files | 16 |
| Config Files | 6 |
| Backend Lines | 940 |
| Frontend Lines | 1,029 |
| Total Code Lines | 1,969 |

## Dependency Summary

### Root (server)
- express: ^4.18.2
- better-sqlite3: ^9.2.2
- node-cron: ^3.0.2
- nodemailer: ^6.9.7
- cors: ^2.8.5
- dotenv: ^16.3.1
- nodemon: ^3.0.2 (dev)

### Client
- react: ^18.2.0
- react-dom: ^18.2.0
- vite: ^5.0.8
- @vitejs/plugin-react: ^4.2.1

## Getting Started

1. Read: `START_HERE.md` (this directory)
2. Install: `bash install.sh`
3. Open: `http://localhost:3000`

## Documentation Reading Order

1. **START_HERE.md** — Overview and quick start
2. **QUICK_START.md** — 5-minute setup guide
3. **README.md** — Full docs, config, examples, troubleshooting
4. **DEVELOPMENT.md** — Dev guide, API, architecture
5. **PROJECT_SUMMARY.md** — Technical overview

---

**Total Project: 27 files, 156K, Complete and ready to use**
