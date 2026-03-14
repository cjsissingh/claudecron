const express = require('express');
const path = require('path');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./db');
const scheduler = require('./scheduler');
const runner = require('./runner');
const router = require('./router');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from client/dist in production
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

// Initialize router with config
const config = db.getConfig();
router.initializeMailer(config);

// ============ API ROUTES ============

// Prompts
app.get('/api/prompts', (req, res) => {
  try {
    const prompts = db.getAllPrompts();
    // Parse output_config for each prompt
    prompts.forEach(p => {
      if (p.output_config) {
        try {
          p.output_config = JSON.parse(p.output_config);
        } catch (e) {
          p.output_config = {};
        }
      }
    });
    res.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/prompts', (req, res) => {
  try {
    const { name, prompt_text, schedule, output_type, output_config, enabled } = req.body;

    // Validate cron expression
    if (!cron.validate(schedule)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }

    const newPrompt = db.createPrompt(
      name,
      prompt_text,
      schedule,
      output_type,
      output_config
    );

    // Schedule the prompt if enabled
    if (enabled !== false) {
      scheduler.schedulePrompt(newPrompt);
    }

    res.json(newPrompt);
  } catch (error) {
    console.error('Error creating prompt:', error);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/prompts/:id', (req, res) => {
  try {
    const prompt = db.getPrompt(parseInt(req.params.id));
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    if (prompt.output_config && typeof prompt.output_config === 'string') {
      try {
        prompt.output_config = JSON.parse(prompt.output_config);
      } catch (e) {
        prompt.output_config = {};
      }
    }
    res.json(prompt);
  } catch (error) {
    console.error('Error fetching prompt:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/prompts/:id', (req, res) => {
  try {
    const { name, prompt_text, schedule, output_type, output_config, enabled } = req.body;
    const id = parseInt(req.params.id);

    // Validate cron expression
    if (!cron.validate(schedule)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }

    const updatedPrompt = db.updatePrompt(
      id,
      name,
      prompt_text,
      schedule,
      output_type,
      output_config,
      enabled
    );

    // Update scheduler
    scheduler.reschedulePrompt(id);

    res.json(updatedPrompt);
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/prompts/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    scheduler.unschedulePrompt(id);
    db.deletePrompt(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({ error: error.message });
  }
});

// Run a prompt immediately
app.post('/api/prompts/:id/run', (req, res) => {
  try {
    const promptId = parseInt(req.params.id);
    const prompt = db.getPrompt(promptId);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    // Run the prompt asynchronously
    runner.runPrompt(promptId).catch(err => {
      console.error('Error in runPrompt:', err);
    });

    // Return immediately with the run that was created
    const runs = db.getRunHistory(promptId, 1);
    res.json(runs[0] || { status: 'running' });
  } catch (error) {
    console.error('Error running prompt:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get run history for a prompt
app.get('/api/prompts/:id/runs', (req, res) => {
  try {
    const promptId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit) || 50;
    const runs = db.getRunHistory(promptId, limit);
    res.json(runs);
  } catch (error) {
    console.error('Error fetching run history:', error);
    res.status(500).json({ error: error.message });
  }
});

// SSE endpoint for streaming run output
app.get('/api/runs/:id/stream', (req, res) => {
  const runId = parseInt(req.params.id);

  // Set up SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Send initial message
  res.write(': SSE connection established\n\n');

  // Subscribe to run output
  const unsubscribe = runner.onRunOutput(runId, (chunk) => {
    if (chunk === '\n[DONE]') {
      res.write('data: [DONE]\n\n');
      res.end();
      unsubscribe();
    } else {
      // Escape newlines and send as data
      const escapedChunk = chunk.replace(/\n/g, '\\n');
      res.write(`data: ${escapedChunk}\n\n`);
    }
  });

  // Handle client disconnect
  req.on('close', () => {
    unsubscribe();
  });
});

// Config
app.get('/api/config', (req, res) => {
  try {
    const config = db.getConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/config', (req, res) => {
  try {
    const { claudePath, smtp, defaultFrom } = req.body;

    db.updateConfig({
      claudePath,
      smtp,
      defaultFrom
    });

    // Re-initialize mailer with new config
    const newConfig = db.getConfig();
    router.initializeMailer(newConfig);

    res.json(newConfig);
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(400).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Fallback to React app for client-side routing
app.get('/*', (req, res) => {
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('Not found');
    }
  });
});

// ============ STARTUP ============

async function start() {
  try {
    // Initialize scheduler with all enabled prompts
    await scheduler.initScheduler();

    // Start the server
    app.listen(PORT, () => {
      console.log(`\n✅ claudecron running at http://localhost:${PORT}\n`);
      console.log('📋 Scheduled jobs:', scheduler.getScheduledJobs().length);
      scheduler.getScheduledJobs().forEach(job => {
        console.log(`  - "${job.name}" @ ${job.schedule}`);
      });
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
