# claudecron

A local-first Claude prompt scheduler with a beautiful web UI. Create, schedule, and manage Claude prompts directly from your browser. Route output to email, files, webhooks, or just store it locally.

## Features

- 🎯 **Create and manage prompts** — Write and edit Claude prompts in a clean web interface
- ⏰ **Schedule with cron** — Run prompts on any schedule using familiar cron expressions
- 📧 **Multiple output formats** — Email results, save to files, POST to webhooks, or keep locally
- ▶️ **Test runs** — Trigger prompts immediately and watch output stream in real-time
- 📊 **Run history** — View past runs, execution time, status, and full output
- 💾 **Persistent storage** — All prompts and run history stored locally with SQLite
- 🔧 **Easy configuration** — Simple config file for Claude path and email settings

## Quick Start

### Prerequisites
- Node.js 16+
- Claude CLI installed and available in PATH (or configure the path in settings)
- (Optional) Email provider credentials if you want to route output to email

### Installation

```bash
git clone https://github.com/yourusername/claudecron.git
cd claudecron
bash install.sh
```

Then open http://localhost:3000 in your browser.

### Manual Setup

```bash
npm install
cd client && npm install && npm run build && cd ..
npm start
```

The app will be available at http://localhost:3000.

## Configuration

### Email Setup

To enable email output, configure SMTP settings in the web UI under Settings:

1. Navigate to **Settings** in the sidebar
2. Fill in your SMTP provider details:
   - **Host** — SMTP server (e.g., `smtp.gmail.com`)
   - **Port** — SMTP port (e.g., `465` for secure, `587` for TLS)
   - **Email** — Your email address
   - **Password** — App-specific password (especially important for Gmail)
   - **Default From** — Email address to send from

#### Gmail Setup (recommended)
1. Enable 2-factor authentication on your Google account
2. Generate an [App Password](https://myaccount.google.com/apppasswords)
3. Use `smtp.gmail.com:465` with your App Password

#### Other Providers
- **Outlook/Office 365**: `smtp-mail.outlook.com:587`
- **SendGrid**: `smtp.sendgrid.net:587`
- **Custom server**: Use your server details

### Claude Path

By default, claudecron looks for the `claude` command in your PATH. If you have Claude installed in a non-standard location, configure it under Settings.

## Usage

### Creating a Prompt

1. Click **Create New Prompt** or go to the Prompts tab
2. Enter a name (e.g., "Daily News Digest")
3. Write your prompt text in the editor
4. Set a schedule using cron syntax (e.g., `0 9 * * *` for 9 AM daily)
5. Choose an output type:
   - **Log only** — Store output in database
   - **Email** — Send output via email
   - **File** — Append output to a file
   - **Webhook** — POST output to a URL
6. Add output config if needed (email address, file path, or webhook URL)
7. Click **Save & Test Run** to test immediately, or just **Save** to schedule

### Cron Expression Guide

Cron syntax: `minute hour day month weekday`

- `0 9 * * *` — Every day at 9:00 AM
- `0 9 * * 1-5` — Weekdays at 9:00 AM
- `0 */6 * * *` — Every 6 hours
- `30 18 * * 0` — Every Sunday at 6:30 PM
- `0 0 1 * *` — First day of every month at midnight

Use [crontab.guru](https://crontab.guru) for help building expressions.

### Example Prompts

#### Daily News Digest
```
You are a news summarizer. Today's date is [insert current date].

Find and summarize the top 5 technology news stories from the past 24 hours.

For each story:
1. Give a one-sentence headline
2. Provide a brief 2-3 sentence summary
3. List key takeaways

Make it concise and easy to scan.
```

**Schedule**: `0 8 * * *` (8 AM daily)
**Output**: Email to yourself

#### Weekly Code Review Reminder
```
Generate a checklist of 10 code review best practices for pull requests.

Focus on:
- Security concerns to check for
- Performance considerations
- Code readability and maintainability
- Common mistakes to catch

Format as a markdown checklist that a team can use.
```

**Schedule**: `0 9 * * 1` (9 AM every Monday)
**Output**: File `/tmp/code-review-checklist.md`

#### Hourly System Health Check
```
Analyze this system's health and performance based on the most recent metrics available to you.

Provide:
1. Overall health score (1-10)
2. Any critical issues
3. Performance metrics summary
4. Recommendations for improvement

Be technical but concise.
```

**Schedule**: `0 * * * *` (every hour)
**Output**: Webhook to your monitoring dashboard

## Project Structure

```
claudecron/
├── package.json                # Root dependencies
├── ecosystem.config.js         # pm2 configuration
├── install.sh                  # Installation script
├── README.md                   # This file
├── server/
│   ├── index.js                # Express server and routes
│   ├── db.js                   # SQLite database and schema
│   ├── scheduler.js            # node-cron job management
│   ├── runner.js               # Prompt execution engine
│   └── router.js               # Output routing (email, file, webhook)
├── client/
│   ├── index.html              # HTML entry point
│   ├── vite.config.js          # Vite build config
│   ├── package.json            # React dependencies
│   └── src/
│       ├── main.jsx            # React entry point
│       ├── App.jsx             # Main app component
│       └── components/
│           ├── PromptList.jsx      # Prompt list and management
│           ├── PromptEditor.jsx    # Create/edit form
│           ├── RunHistory.jsx      # Past runs view
│           └── TestRun.jsx         # Test run with streaming output
└── config/
    └── config.json             # User configuration
```

## API Documentation

### Prompts

- `GET /api/prompts` — List all prompts
- `POST /api/prompts` — Create a new prompt
- `GET /api/prompts/:id` — Get a single prompt
- `PUT /api/prompts/:id` — Update a prompt
- `DELETE /api/prompts/:id` — Delete a prompt
- `POST /api/prompts/:id/run` — Trigger immediate execution
- `GET /api/prompts/:id/runs` — Get run history

### Runs

- `GET /api/runs/:id/stream` — Server-sent events stream of live output

### Config

- `GET /api/config` — Get current configuration
- `PUT /api/config` — Update configuration

## Development

### Running in Development Mode

```bash
# Terminal 1: Start the backend server (with auto-reload)
npm run dev

# Terminal 2: Start the Vite dev server
cd client
npm run dev
```

The frontend will be at http://localhost:5173 and proxies API calls to http://localhost:3000.

### Building for Production

```bash
npm run build
npm start
```

## Database

Prompts and run history are stored in `claudecron.db` (SQLite). The database is automatically created and migrated on first run.

### Schema

**prompts table**
- `id` — Primary key
- `name` — Prompt name
- `prompt_text` — The actual prompt
- `schedule` — Cron expression
- `output_type` — email | file | webhook | log
- `output_config` — JSON with type-specific config
- `enabled` — Boolean, whether the prompt is scheduled
- `created_at` — Timestamp
- `updated_at` — Timestamp

**runs table**
- `id` — Primary key
- `prompt_id` — Foreign key to prompts
- `started_at` — When execution started
- `finished_at` — When execution completed
- `status` — running | success | error
- `output` — Full output text
- `error` — Error message if failed

## Troubleshooting

### Claude CLI Not Found
Make sure the Claude CLI is installed and in your PATH. You can configure a custom path in Settings.

```bash
# Test if Claude is available
which claude
claude --version
```

### Prompts Not Running
1. Check that the prompt is **enabled** (toggle in prompt list)
2. Verify the cron expression is valid (use crontab.guru)
3. Check the logs in the web UI under Run History
4. Check pm2 logs: `pm2 logs claudecron`

### Email Not Sending
1. Verify SMTP credentials in Settings
2. Check that "Default From" email is configured
3. Check pm2 logs for SMTP errors: `pm2 logs claudecron`
4. For Gmail, ensure you're using an [App Password](https://myaccount.google.com/apppasswords), not your account password

### Database Locked
If you get "database is locked" errors:
1. Close any other connections to the database
2. Restart the app: `pm2 restart claudecron`
3. Check for stuck processes: `pm2 info claudecron`

## Performance

- claudecron is designed for single-user or small team use
- Suitable for hundreds of scheduled prompts
- Database is kept clean with automatic archival (old runs are kept by default)
- Memory usage is minimal; typical installation uses <100MB

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN bash install.sh
EXPOSE 3000
CMD ["npm", "start"]
```

### systemd Service

Create `/etc/systemd/system/claudecron.service`:
```ini
[Unit]
Description=claudecron - Claude Prompt Scheduler
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/claudecron
ExecStart=/usr/bin/node server/index.js
Restart=on-failure
RestartSec=10
Environment="NODE_ENV=production"
Environment="PORT=3000"

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable claudecron
sudo systemctl start claudecron
```

## Security Notes

- claudecron runs locally by default; do not expose to the internet without authentication
- The Claude CLI flag `--dangerously-skip-permissions` is used to allow prompts to be run without user confirmation
- Keep your config.json secure; it contains email credentials
- Consider running behind a reverse proxy (nginx, Caddy) with authentication

## License

MIT

## Contributing

Contributions welcome! Please submit issues and pull requests.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

Made with ❤️ for prompt enthusiasts
