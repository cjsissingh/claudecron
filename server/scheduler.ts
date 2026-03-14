import cron from 'node-cron';
import * as db from './db';
import { runPrompt } from './runner';
import type { Prompt } from './db';

interface ScheduledJob {
  id: number;
  name: string;
  schedule: string;
  enabled: boolean;
}

const scheduledJobs = new Map<number, cron.ScheduledTask>();

export async function schedulePrompt(prompt: Prompt): Promise<void> {
  if (scheduledJobs.has(prompt.id)) {
    unschedulePrompt(prompt.id);
  }

  if (!prompt.enabled) {
    return;
  }

  try {
    if (!cron.validate(prompt.schedule)) {
      console.error(`Invalid cron expression for prompt ${prompt.id}: ${prompt.schedule}`);
      return;
    }

    const job = cron.schedule(prompt.schedule, async () => {
      console.log(`[Scheduler] Running prompt: ${prompt.name}`);
      try {
        await runPrompt(prompt.id);
      } catch (error) {
        console.error(`[Scheduler] Error running prompt ${prompt.id}:`, (error as Error).message);
      }
    });

    scheduledJobs.set(prompt.id, job);
    console.log(
      `[Scheduler] Scheduled prompt ${prompt.id}: "${prompt.name}" with cron "${prompt.schedule}"`
    );
  } catch (error) {
    console.error(`[Scheduler] Error scheduling prompt ${prompt.id}:`, error);
  }
}

export function unschedulePrompt(promptId: number): void {
  const job = scheduledJobs.get(promptId);
  if (job) {
    job.stop();
    scheduledJobs.delete(promptId);
    console.log(`[Scheduler] Unscheduled prompt ${promptId}`);
  }
}

export function reschedulePrompt(promptId: number): void {
  const prompt = db.getPrompt(promptId);
  if (prompt) {
    schedulePrompt(prompt);
  }
}

async function rescheduleAll(): Promise<void> {
  scheduledJobs.forEach((job) => {
    job.stop();
  });
  scheduledJobs.clear();

  const prompts = db.getAllPrompts();
  for (const prompt of prompts) {
    if (prompt.enabled) {
      await schedulePrompt(prompt);
    }
  }

  console.log(`[Scheduler] Rescheduled ${scheduledJobs.size} prompts`);
}

export async function initScheduler(): Promise<void> {
  console.log('[Scheduler] Initializing scheduler...');
  await rescheduleAll();
  console.log('[Scheduler] Scheduler initialized');
}

export function getScheduledJobs(): ScheduledJob[] {
  return Array.from(scheduledJobs.entries()).map(([id]) => {
    const prompt = db.getPrompt(id);
    return {
      id,
      name: prompt?.name || 'Unknown',
      schedule: prompt?.schedule || 'Unknown',
      enabled: !!prompt?.enabled,
    };
  });
}
