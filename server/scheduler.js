const cron = require('node-cron');
const db = require('./db');
const runner = require('./runner');

const scheduledJobs = new Map();

async function schedulePrompt(prompt) {
  // If prompt is already scheduled, unschedule it first
  if (scheduledJobs.has(prompt.id)) {
    unschedulePrompt(prompt.id);
  }

  // Only schedule if enabled
  if (!prompt.enabled) {
    return;
  }

  try {
    // Validate cron expression
    if (!cron.validate(prompt.schedule)) {
      console.error(
        `Invalid cron expression for prompt ${prompt.id}: ${prompt.schedule}`,
      );
      return;
    }

    // Schedule the job
    const job = cron.schedule(prompt.schedule, async () => {
      console.log(`[Scheduler] Running prompt: ${prompt.name}`);
      try {
        await runner.runPrompt(prompt.id);
      } catch (error) {
        console.error(
          `[Scheduler] Error running prompt ${prompt.id}:`,
          error.message,
        );
      }
    });

    scheduledJobs.set(prompt.id, job);
    console.log(
      `[Scheduler] Scheduled prompt ${prompt.id}: "${prompt.name}" with cron "${prompt.schedule}"`,
    );
  } catch (error) {
    console.error(`[Scheduler] Error scheduling prompt ${prompt.id}:`, error);
  }
}

function unschedulePrompt(promptId) {
  const job = scheduledJobs.get(promptId);
  if (job) {
    job.stop();
    scheduledJobs.delete(promptId);
    console.log(`[Scheduler] Unscheduled prompt ${promptId}`);
  }
}

function reschedulePrompt(promptId) {
  const prompt = db.getPrompt(promptId);
  if (prompt) {
    schedulePrompt(prompt);
  }
}

async function rescheduleAll() {
  // Stop all existing jobs
  scheduledJobs.forEach((job, id) => {
    job.stop();
  });
  scheduledJobs.clear();

  // Load and schedule all enabled prompts
  const prompts = db.getAllPrompts();
  prompts.forEach((prompt) => {
    if (prompt.enabled) {
      schedulePrompt(prompt);
    }
  });

  console.log(`[Scheduler] Rescheduled ${scheduledJobs.size} prompts`);
}

async function initScheduler() {
  console.log('[Scheduler] Initializing scheduler...');
  await rescheduleAll();
  console.log('[Scheduler] Scheduler initialized');
}

function getScheduledJobs() {
  return Array.from(scheduledJobs.entries()).map(([id, job]) => {
    const prompt = db.getPrompt(id);
    return {
      id,
      name: prompt?.name || 'Unknown',
      schedule: prompt?.schedule || 'Unknown',
      enabled: prompt?.enabled || false,
    };
  });
}

module.exports = {
  initScheduler,
  schedulePrompt,
  unschedulePrompt,
  reschedulePrompt,
  rescheduleAll,
  getScheduledJobs,
};
