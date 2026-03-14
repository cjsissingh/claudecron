# Quick Start Guide

Get claudecron running in 5 minutes.

## Step 1: Prerequisites

Make sure you have:
- **Node.js 18+** — Download from [nodejs.org](https://nodejs.org)
- **Claude CLI** — Install from [Anthropic docs](https://docs.anthropic.com/claude/reference/claude-cli-quickstart)

Verify:
```bash
node --version      # Should be v18 or higher
npm --version       # Should be included with Node
which claude        # Should show path to Claude CLI
```

## Step 2: Download claudecron

```bash
git clone https://github.com/yourusername/claudecron.git
cd claudecron
```

Or download as ZIP and extract.

## Step 3: Install & Start

One command to install everything and start:

```bash
bash install.sh
```

This will:
1. Install backend dependencies
2. Install frontend dependencies
3. Build the React app
4. Set up pm2 for process management
5. Start the server

Wait for it to complete (~1-2 minutes).

## Step 4: Open in Browser

Go to: **http://localhost:3000**

That's it! The app is running.

## First Steps

### Create Your First Prompt

1. Click **"New Prompt"** button
2. Enter a name: `Hello World Test`
3. Enter prompt text:
   ```
   Say hello and list 5 interesting facts about the number 42.
   ```
4. Keep schedule as `0 9 * * *` (daily at 9 AM)
5. Keep output type as "Log Only"
6. Click **"Save & Test Run"**

Watch the output stream in real-time!

### Try Email Output

1. Go to **Settings** in the sidebar
2. Configure your email:
   - **SMTP Host:** `smtp.gmail.com`
   - **Port:** `465`
   - **Email:** your-email@gmail.com
   - **Password:** Your App Password (if using Gmail)
   - **Default From:** your-email@gmail.com

   > For Gmail: Create an [App Password](https://myaccount.google.com/apppasswords) instead of using your regular password.

3. Create a new prompt with output type "Email"
4. Click "Test Run" to send yourself the output!

## Stopping & Restarting

### Stop claudecron
```bash
pm2 stop claudecron
```

### Restart
```bash
pm2 restart claudecron
```

### View logs
```bash
pm2 logs claudecron
```

### Completely stop
```bash
pm2 delete claudecron
```

## Common Issues

**"Claude: command not found"**
- Make sure Claude CLI is installed: `which claude`
- Or set the path in Settings

**"Port 3000 already in use"**
- Kill the process: `lsof -i :3000` then `kill -9 <PID>`
- Or use different port: `PORT=3001 npm start`

**"Email not sending"**
- Check SMTP credentials in Settings
- For Gmail, make sure you're using an [App Password](https://myaccount.google.com/apppasswords)
- Check pm2 logs: `pm2 logs claudecron`

**"Database locked"**
- Stop all servers: `pm2 kill`
- Restart: `pm2 start ecosystem.config.js`

## Populate with Examples

Want example prompts to explore?

```bash
npm run seed
npm start
```

This adds 5 example prompts to play with.

## Next Steps

- Read [README.md](./README.md) for full documentation
- Check [DEVELOPMENT.md](./DEVELOPMENT.md) for the development guide
- Explore cron expression syntax at [crontab.guru](https://crontab.guru)

## System Auto-Start (Optional)

Make claudecron start automatically when your computer boots:

```bash
pm2 startup
```

This prints a command to run. Copy and paste it.

Then:
```bash
pm2 save
```

## Need Help?

- Check the logs: `pm2 logs claudecron`
- Review [README.md](./README.md) for more details
- Check [DEVELOPMENT.md](./DEVELOPMENT.md) if you want to modify the code

---

Enjoy scheduling your Claude prompts! 🚀
