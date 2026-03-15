import express, { Request, Response } from 'express';
import path from 'path';
import cors from 'cors';
import cron from 'node-cron';
import * as db from './db';
import * as scheduler from './scheduler';
import { runPrompt, onRunOutput } from './runner';
import { initializeMailer } from './router';

const app = express();
const PORT = process.env['PORT'] || 3000;

app.use(cors());
app.use(express.json());

const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

const config = db.getConfig();
initializeMailer(config);

// ============ API ROUTES ============

app.get('/api/prompts', (req: Request, res: Response) => {
  try {
    const prompts = db.getAllPrompts();
    prompts.forEach((p) => {
      if (p.output_config && typeof p.output_config === 'string') {
        try {
          p.output_config = JSON.parse(p.output_config) as Record<string, unknown>;
        } catch {
          p.output_config = {};
        }
      }
    });
    res.json(prompts);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/prompts', (req: Request, res: Response) => {
  try {
    const { name, prompt_text, schedule, output_type, output_config, enabled } = req.body as {
      name: string;
      prompt_text: string;
      schedule: string;
      output_type: string;
      output_config: Record<string, unknown>;
      enabled?: boolean;
    };

    if (!cron.validate(schedule)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }

    const newPrompt = db.createPrompt(name, prompt_text, schedule, output_type, output_config);

    if (enabled !== false) {
      scheduler.schedulePrompt(newPrompt);
    }

    res.json(newPrompt);
  } catch (error) {
    console.error('Error creating prompt:', error);
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/api/prompts/test', async (req: Request, res: Response) => {
  try {
    const { promptText } = req.body as { promptText?: string };
    if (!promptText) {
      return res.status(400).json({ error: 'promptText is required' });
    }

    const tempPrompt = db.createPrompt('__test__', promptText, '* * * * *', 'log', null);

    runPrompt(tempPrompt.id).finally(() => {
      setTimeout(() => db.deletePrompt(tempPrompt.id), 30000);
    });

    const runs = db.getRunHistory(tempPrompt.id, 1);
    res.json({ runId: runs[0]?.id });
  } catch (error) {
    console.error('Error running test prompt:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/prompts/:id', (req: Request, res: Response) => {
  try {
    const prompt = db.getPrompt(parseInt(req.params['id']!));
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    if (prompt.output_config && typeof prompt.output_config === 'string') {
      try {
        prompt.output_config = JSON.parse(prompt.output_config) as Record<string, unknown>;
      } catch {
        prompt.output_config = {};
      }
    }
    res.json(prompt);
  } catch (error) {
    console.error('Error fetching prompt:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/prompts/:id', (req: Request, res: Response) => {
  try {
    const { name, prompt_text, schedule, output_type, output_config, enabled } = req.body as {
      name: string;
      prompt_text: string;
      schedule: string;
      output_type: string;
      output_config: Record<string, unknown>;
      enabled: boolean;
    };
    const id = parseInt(req.params['id']!);

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

    scheduler.reschedulePrompt(id);

    res.json(updatedPrompt);
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(400).json({ error: (error as Error).message });
  }
});

app.delete('/api/prompts/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params['id']!);
    scheduler.unschedulePrompt(id);
    db.deletePrompt(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting prompt:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/prompts/:id/run', (req: Request, res: Response) => {
  try {
    const promptId = parseInt(req.params['id']!);
    const prompt = db.getPrompt(promptId);
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    runPrompt(promptId).catch((err: Error) => {
      console.error('Error in runPrompt:', err);
    });

    const runs = db.getRunHistory(promptId, 1);
    res.json(runs[0] || { status: 'running' });
  } catch (error) {
    console.error('Error running prompt:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/prompts/:id/runs', (req: Request, res: Response) => {
  try {
    const promptId = parseInt(req.params['id']!);
    const limit = parseInt((req.query['limit'] as string) || '50');
    const runs = db.getRunHistory(promptId, limit);
    res.json(runs);
  } catch (error) {
    console.error('Error fetching run history:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/runs/:id/stream', (req: Request, res: Response) => {
  const runId = parseInt(req.params['id']!);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.write(': SSE connection established\n\n');

  const unsubscribe = onRunOutput(runId, (chunk: string) => {
    if (chunk === '\n[DONE]') {
      res.write('data: [DONE]\n\n');
      res.end();
      unsubscribe();
    } else {
      const escapedChunk = chunk.replace(/\n/g, '\\n');
      res.write(`data: ${escapedChunk}\n\n`);
    }
  });

  req.on('close', () => {
    unsubscribe();
  });
});

app.get('/api/config', (req: Request, res: Response) => {
  try {
    const cfg = db.getConfig();
    res.json(cfg);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/config', (req: Request, res: Response) => {
  try {
    const { claudePath, smtp, defaultFrom } = req.body as db.AppConfig;

    db.updateConfig({ claudePath, smtp, defaultFrom });

    const newConfig = db.getConfig();
    initializeMailer(newConfig);

    res.json(newConfig);
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(400).json({ error: (error as Error).message });
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('*', (_req: Request, res: Response) => {
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('Not found');
    }
  });
});

// ============ STARTUP ============

async function start(): Promise<void> {
  try {
    await scheduler.initScheduler();

    app.listen(PORT, () => {
      console.log(`\n✅ claudecron running at http://localhost:${PORT}\n`);
      console.log('📋 Scheduled jobs:', scheduler.getScheduledJobs().length);
      scheduler.getScheduledJobs().forEach((job) => {
        console.log(`  - "${job.name}" @ ${job.schedule}`);
      });
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

start();

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

export default app;
