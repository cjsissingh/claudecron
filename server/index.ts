import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import * as db from './db';
import type { OutputConfig } from './db';
import * as scheduler from './scheduler';
import { runPrompt, onRunOutput } from './runner';
import { initializeMailer } from './router';
import { validateCronExpression } from './validation';
import { asyncHandler, errorMiddleware } from './middleware';

const app = express();
const PORT = process.env['PORT'] || 3000;

app.use(cors());
app.use(express.json());

const clientDist = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDist));

const config = db.getConfig();
initializeMailer(config);

const staleCount = db.markStaleRunsFailed();
if (staleCount > 0) {
  console.log(`[Startup] Marked ${staleCount} stale run(s) as failed`);
}

// ============ API ROUTES ============

app.get(
  '/api/prompts',
  asyncHandler(async (_req: Request, res: Response) => {
    const prompts = db.getAllPrompts();
    res.json(prompts);
  })
);

app.post(
  '/api/prompts',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, prompt_text, schedule, output_type, output_config, enabled } = req.body as {
      name: string;
      prompt_text: string;
      schedule: string;
      output_type: string;
      output_config: OutputConfig | null;
      enabled?: boolean;
    };

    if (!validateCronExpression(schedule)) {
      return res.status(400).json({ error: 'Invalid cron expression' });
    }

    const newPrompt = db.createPrompt(name, prompt_text, schedule, output_type, output_config);

    if (enabled !== false) {
      scheduler.schedulePrompt(newPrompt);
    }

    res.json(newPrompt);
  })
);

app.post(
  '/api/prompts/test',
  asyncHandler(async (req: Request, res: Response) => {
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
  })
);

app.get(
  '/api/prompts/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const prompt = db.getPrompt(parseInt(req.params['id']!));
    if (!prompt) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    res.json(prompt);
  })
);

app.put(
  '/api/prompts/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { name, prompt_text, schedule, output_type, output_config, enabled } = req.body as {
      name: string;
      prompt_text: string;
      schedule: string;
      output_type: string;
      output_config: OutputConfig | null;
      enabled: boolean;
    };
    const id = parseInt(req.params['id']!);

    if (!validateCronExpression(schedule)) {
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
  })
);

app.delete(
  '/api/prompts/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params['id']!);
    scheduler.unschedulePrompt(id);
    db.deletePrompt(id);
    res.json({ success: true });
  })
);

app.post(
  '/api/prompts/:id/run',
  asyncHandler(async (req: Request, res: Response) => {
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
  })
);

app.get(
  '/api/prompts/:id/runs',
  asyncHandler(async (req: Request, res: Response) => {
    const promptId = parseInt(req.params['id']!);
    const limit = parseInt((req.query['limit'] as string) || '50');
    const runs = db.getRunHistory(promptId, limit);
    res.json(runs);
  })
);

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

app.get(
  '/api/config',
  asyncHandler(async (_req: Request, res: Response) => {
    const cfg = db.getConfig();
    res.json(cfg);
  })
);

app.put(
  '/api/config',
  asyncHandler(async (req: Request, res: Response) => {
    const { claudePath, smtp, defaultFrom } = req.body as db.AppConfig;

    db.updateConfig({ claudePath, smtp, defaultFrom });

    const newConfig = db.getConfig();
    initializeMailer(newConfig);

    res.json(newConfig);
  })
);

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

app.use(errorMiddleware);

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
