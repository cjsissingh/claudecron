import { describe, it, expect, beforeEach } from 'vitest';
import * as db from './db';

function makeTestPrompt() {
  return db.createPrompt('sweep-test', 'say hello', '* * * * *', 'log', { type: 'log' });
}

describe('markStaleRunsFailed', () => {
  let promptId: number;

  beforeEach(() => {
    // Use a unique name per test to avoid UNIQUE constraint on prompt name
    const prompt = db.createPrompt(
      `sweep-test-${Date.now()}-${Math.random()}`,
      'say hello',
      '* * * * *',
      'log',
      { type: 'log' }
    );
    promptId = prompt.id;
  });

  it('marks runs stuck in running state as error', () => {
    const runId = db.createRun(promptId);

    const affected = db.markStaleRunsFailed('Server restarted');

    expect(affected).toBeGreaterThanOrEqual(1);
    const run = db.getRun(runId);
    expect(run?.status).toBe('error');
    expect(run?.error).toBe('Server restarted');
    expect(run?.finished_at).not.toBeNull();

    db.deletePrompt(promptId);
  });

  it('does not touch runs already finished', () => {
    const runId = db.createRun(promptId);
    db.finishRun(runId, 'success', null);

    db.markStaleRunsFailed('Server restarted');

    const run = db.getRun(runId);
    expect(run?.status).toBe('success');

    db.deletePrompt(promptId);
  });

  it('returns 0 when no stale runs exist', () => {
    const runId = db.createRun(promptId);
    db.finishRun(runId, 'success', null);

    const affected = db.markStaleRunsFailed();

    expect(affected).toBe(0);

    db.deletePrompt(promptId);
  });
});
