import type { ChildProcess } from 'child_process';
import type { Prompt, AppConfig } from './db';

export interface RunPersistence {
  getPrompt: (id: number) => Prompt | undefined;
  createRun: (promptId: number) => number;
  getConfig: () => AppConfig;
  appendOutput: (runId: number, chunk: string) => void;
  finishRun: (runId: number, status: string, error: string | null) => void;
}

export type OutputRouter = (
  prompt: Prompt,
  output: string,
  status: string,
  error: string | null
) => Promise<void>;

export type Spawner = (claudePath: string, args: string[]) => ChildProcess;

export interface RunnerDeps {
  persist: RunPersistence;
  routeOutput: OutputRouter;
  spawn: Spawner;
}

export interface RunResult {
  runId: number;
  output: string;
  status: string;
}

interface RunState {
  listeners: Array<(chunk: string) => void>;
  buffer: string;
}

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

export function cleanupRun(runId: number): void {
  activeRuns.delete(runId);
}

export function resetActiveRuns(): void {
  activeRuns.clear();
}

export function getRun(runId: number): RunState | undefined {
  return activeRuns.get(runId);
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

export async function runPrompt(promptId: number, deps: RunnerDeps): Promise<RunResult> {
  const prompt = deps.persist.getPrompt(promptId);
  if (!prompt) {
    throw new Error(`Prompt ${promptId} not found`);
  }

  const runId = deps.persist.createRun(promptId);
  console.log(`[Run ${runId}] Starting prompt: ${prompt.name}`);

  try {
    const config = deps.persist.getConfig();
    const claudePath = config.claudePath || 'claude';

    return new Promise((resolve, reject) => {
      const child = deps.spawn(claudePath, [
        '-p',
        prompt.prompt_text,
        '--dangerously-skip-permissions',
      ]);

      let output = '';
      let errorOutput = '';

      child.stdout!.on('data', (data: Buffer) => {
        const chunk = data.toString();
        output += chunk;
        deps.persist.appendOutput(runId, chunk);
        emitOutput(runId, chunk);
      });

      child.stderr!.on('data', (data: Buffer) => {
        const chunk = data.toString();
        errorOutput += chunk;
        deps.persist.appendOutput(runId, chunk);
        emitOutput(runId, chunk);
      });

      child.on('close', (code: number | null) => {
        const status = code === 0 ? 'success' : 'error';
        const errorMsg =
          code === 0
            ? null
            : `Process exited with code ${code}${errorOutput ? ': ' + errorOutput : ''}`;

        console.log(`[Run ${runId}] Completed with status: ${status}`);
        deps.persist.finishRun(runId, status, errorMsg);

        deps.routeOutput(prompt, output, status, errorMsg).catch((e) => {
          console.error('Error routing output:', e);
        });

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
        deps.persist.finishRun(runId, 'error', error.message);
        emitOutput(runId, `\nError: ${error.message}\n[DONE]`);
        setTimeout(() => cleanupRun(runId), 5000);
        reject(error);
      });
    });
  } catch (error) {
    const err = error as Error;
    console.error(`[Run ${runId}] Error:`, err);
    deps.persist.finishRun(runId, 'error', err.message);
    emitOutput(runId, `\nError: ${err.message}\n[DONE]`);
    setTimeout(() => cleanupRun(runId), 5000);
    throw err;
  }
}
