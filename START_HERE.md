# START HERE

Welcome to **claudecron** — a local-first Claude prompt scheduler with a web UI.

## What is this?

A web app that lets you:
- Create Claude prompts in a beautiful UI
- Schedule them to run automatically (every hour, daily, weekly, etc.)
- Route the output to email, files, webhooks, or just store it
- Test-run prompts and see real-time output
- View all your scheduled runs and history

## Getting Started (2 minutes)

### 1. Install
```bash
bash install.sh
```

### 2. Open Browser
Go to: **http://localhost:3000**

### 3. Create Your First Prompt
- Click "New Prompt"
- Enter a name and some text
- Click "Save & Test Run"
- Watch it execute!

## Documentation

Read these in order:

1. **[QUICK_START.md](./QUICK_START.md)** (5 min read)
   - How to set up in 5 minutes
   - First steps and common issues

2. **[README.md](./README.md)** (15 min read)
   - Features overview
   - Configuration guide
   - Usage examples
   - Troubleshooting

3. **[DEVELOPMENT.md](./DEVELOPMENT.md)** (for developers)
   - How the app works
   - API reference
   - How to extend it

4. **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** (technical overview)
   - What's included
   - Tech stack
   - File structure

## Requirements

- **Node.js 18+** (get from nodejs.org)
- **Claude CLI** (installed and in PATH)

Check:
```bash
node --version      # Should be 18+
which claude        # Should work
```

## Key Features

✅ Create and manage prompts
✅ Schedule with cron expressions (daily, weekly, etc.)
✅ Test-run with live output streaming
✅ Email output (configure your SMTP)
✅ File output (append to log files)
✅ Webhook output (POST to your services)
✅ Run history with full logs
✅ Settings management
✅ One-command install

## Directory Structure

```
claudecron/
├── server/           # Backend (Express + SQLite)
├── client/           # Frontend (React + Vite)
├── scripts/          # Helper scripts (seed data)
├── config/           # Config templates
├── package.json      # Dependencies
├── install.sh        # One-command setup
└── *.md             # Documentation
```

## Next Steps

### Just Want to Use It?
→ Follow [QUICK_START.md](./QUICK_START.md)

### Want to Understand It?
→ Read [README.md](./README.md)

### Want to Develop or Deploy?
→ Check [DEVELOPMENT.md](./DEVELOPMENT.md)

### Want a Technical Overview?
→ See [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)

## Support

### Common Issues?
See Troubleshooting section in [README.md](./README.md)

### Technical Questions?
Check [DEVELOPMENT.md](./DEVELOPMENT.md)

### Want Examples?
Run `npm run seed` to populate with example prompts

## Status

✅ **Complete and ready to use**

All features implemented:
- Web UI with React
- Express backend with REST API
- SQLite database
- Cron scheduling
- Output routing (email, file, webhook)
- Real-time streaming
- Process management

No TODOs or placeholders. Deploy with confidence.

---

## Quick Commands

```bash
# Install and start
bash install.sh

# View logs
pm2 logs claudecron

# Stop server
pm2 stop claudecron

# Restart server
pm2 restart claudecron

# Populate with examples
npm run seed

# Development (two terminals)
npm run dev          # Backend
cd client && npm run dev  # Frontend

# Production build
npm run build
npm start
```

---

👉 **[Read QUICK_START.md next](./QUICK_START.md)**
