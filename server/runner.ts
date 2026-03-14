import { spawn } from 'child_process';
import * as db from './db';
import { routeOutput } from './router';
import type { Prompt } from './db';

interface RunState {
  listeners: Array<(chunk: string) => void>;
  buffer: string;
}

// Map to track active runs for SSE streaming
const activeRuns = new Map<number, RunState>();

function getRunState(runId: number): RunState {
  if (!activeRuns.has(runId)) {
    activeRuns.set(runId, { listeners: [], buffer: '' });
  }
  return activeRuns.get(runId)!;
}

export function onRunOutput(runId: number, callback: (chunk: string) => void): () => void {
  const run = getRunState(runId);
  run.listeners.push(callback);
  if (run.buffer) {
    callback(run.buffer);
  }
  return () => {
    run.listeners = run.listeners.filter((l) => l !== callback);
  };
}

function emitOutput(runId: number, chunk: string): void {
  const run = getRunState(runId);
  run.buffer += chunk;
  run.listeners.forEach((listener) => {
    try {
      listener(chunk);
    } catch (e) {
      console.error('Error in output listener:', e);
    }
  });
}

export function cleanupRun(runId: number): void {
  activeRuns.delete(runId);
}

export function getRun(runId: number): RunState | undefined {
  return activeRuns.get(runId);
}

export async function runPrompt(promptId: number): Promise<{ runId: number; output: string; status: string }> {
  const prompt = db.getPrompt(promptId);
  if (!prompt) {
    throw new Error(`Prompt ${promptId} not found`);
  }

  const runId = db.createRun(promptId);

  console.log(`[Run ${runId}] Starting prompt: ${prompt.name}`);

  try {
    const config = db.getConfig();
    const claudePath = config.claudePath || 'claude';

    return new Promise((resolve, reject) => {
      const child = spawn(claudePath, ['-p', prompt.prompt_text, '--dangerously-skip-permissions'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let output = '';
      let errorOutput = '';

      child.stdout!.on('data', (data: Buffer) => {
        const chunk = data.toString();
        output += chunk;
        db.appendRunOutput(runId, chunk);
        emitOutput(runId, chunk);
      });

      child.stderr!.on('data', (data: Buffer) => {
        const chunk = data.toString();
        errorOutput += chunk;
        db.appendRunOutput(runId, chunk);
        emitOutput(runId, chunk);
      });

      child.on('close', (code: number | null) => {
        const status = code === 0 ? 'success' : 'error';
        const errorMsg =
          code === 0
            ? null
            : `Process exited with code ${code}${errorOutput ? ': ' + errorOutput : ''}`;

        console.log(`[Run ${runId}] Completed with status: ${status}`);

        db.finishRun(runId, status, errorMsg);

        try {
          routeOutput(prompt as Prompt & { output_config: Record<string, unknown> }, output, status, errorMsg);
        } catch (e) {
          console.error('Error routing output:', e);
        }

        emitOutput(runId, '\n[DONE]');
        setTimeout(() => cleanupRun(runId), 5000);

        if (status === 'success') {
          resolve({ runId, output, status: 'success' });
        } else {
          reject(new Error(errorMsg || `Process exited with code ${code}`));
        }
      });

      child.on('error', (error: Error) => {
        console.error(`[Run ${runId}] Error spawning process:`, error);
        const errorMsg = error.message;
        db.finishRun(runId, 'error', errorMsg);
        emitOutput(runId, `\nError: ${errorMsg}\n[DONE]`);
        setTimeout(() => cleanupRun(runId), 5000);
        reject(error);
      });
    });
  } catch (error) {
    const err = error as Error;
    console.error(`[Run ${runId}] Error:`, err);
    db.finishRun(runId, 'error', err.message);
    emitOutput(runId, `\nError: ${err.message}\n[DONE]`);
    setTimeout(() => cleanupRun(runId), 5000);
    throw err;
  }
}
