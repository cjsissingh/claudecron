import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { runPrompt, onRunOutput, cleanupRun, resetActiveRuns, getRun } from './execution';
import type { RunnerDeps } from './execution';
import type { Prompt, AppConfig } from './db';

function makePrompt(overrides: Partial<Prompt> = {}): Prompt {
  return {
    id: 1,
    name: 'test-prompt',
    prompt_text: 'say hello',
    schedule: '* * * * *',
    output_type: 'log',
    output_config: { type: 'log' },
    enabled: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    claudePath: '/usr/bin/claude',
    smtp: { host: '', port: 587, secure: false, user: '', password: '' },
    defaultFrom: '',
    ...overrides,
  };
}

function makeFakeProcess(): EventEmitter & { stdout: EventEmitter; stderr: EventEmitter } {
  const proc = new EventEmitter() as EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  return proc;
}

function makeDeps(overrides: Partial<RunnerDeps> = {}): RunnerDeps {
  return {
    persist: {
      getPrompt: vi.fn().mockReturnValue(makePrompt()),
      createRun: vi.fn().mockReturnValue(42),
      getConfig: vi.fn().mockReturnValue(makeConfig()),
      appendOutput: vi.fn(),
      finishRun: vi.fn(),
    },
    routeOutput: vi.fn().mockResolvedValue(undefined),
    spawn: vi.fn(),
    ...overrides,
  };
}

describe('runPrompt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetActiveRuns();
  });

  it('throws when prompt not found', async () => {
    const deps = makeDeps();
    (deps.persist.getPrompt as ReturnType<typeof vi.fn>).mockReturnValue(undefined);

    await expect(runPrompt(99, deps)).rejects.toThrow('Prompt 99 not found');
  });

  it('resolves with output and runId on success', async () => {
    const proc = makeFakeProcess();
    const deps = makeDeps({ spawn: vi.fn().mockReturnValue(proc) });

    const promise = runPrompt(1, deps);

    proc.stdout.emit('data', Buffer.from('hello '));
    proc.stdout.emit('data', Buffer.from('world'));
    proc.emit('close', 0);

    const result = await promise;

    expect(result.runId).toBe(42);
    expect(result.output).toBe('hello world');
    expect(result.status).toBe('success');
    expect(deps.persist.finishRun).toHaveBeenCalledWith(42, 'success', null);
  });

  it('rejects on non-zero exit code', async () => {
    const proc = makeFakeProcess();
    const deps = makeDeps({ spawn: vi.fn().mockReturnValue(proc) });

    const promise = runPrompt(1, deps);

    proc.stderr.emit('data', Buffer.from('something went wrong'));
    proc.emit('close', 1);

    await expect(promise).rejects.toThrow('Process exited with code 1');
    expect(deps.persist.finishRun).toHaveBeenCalledWith(
      42,
      'error',
      'Process exited with code 1: something went wrong'
    );
  });

  it('routes output after successful run', async () => {
    const proc = makeFakeProcess();
    const deps = makeDeps({ spawn: vi.fn().mockReturnValue(proc) });

    const promise = runPrompt(1, deps);
    proc.stdout.emit('data', Buffer.from('result'));
    proc.emit('close', 0);
    await promise;

    expect(deps.routeOutput).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1 }),
      'result',
      'success',
      null
    );
  });

  it('appends each stdout chunk immediately', async () => {
    const proc = makeFakeProcess();
    const deps = makeDeps({ spawn: vi.fn().mockReturnValue(proc) });

    const promise = runPrompt(1, deps);

    proc.stdout.emit('data', Buffer.from('chunk1'));
    expect(deps.persist.appendOutput).toHaveBeenCalledWith(42, 'chunk1');

    proc.stdout.emit('data', Buffer.from('chunk2'));
    expect(deps.persist.appendOutput).toHaveBeenCalledWith(42, 'chunk2');

    proc.emit('close', 0);
    await promise;
  });

  it('rejects and marks run failed when spawn errors', async () => {
    const proc = makeFakeProcess();
    const deps = makeDeps({ spawn: vi.fn().mockReturnValue(proc) });

    const promise = runPrompt(1, deps);
    proc.emit('error', new Error('ENOENT: claude not found'));

    await expect(promise).rejects.toThrow('ENOENT: claude not found');
    expect(deps.persist.finishRun).toHaveBeenCalledWith(42, 'error', 'ENOENT: claude not found');
  });

  it('late SSE subscriber receives already-buffered output', async () => {
    const proc = makeFakeProcess();
    const deps = makeDeps({ spawn: vi.fn().mockReturnValue(proc) });

    const promise = runPrompt(1, deps);
    proc.stdout.emit('data', Buffer.from('buffered'));

    const received: string[] = [];
    onRunOutput(42, (chunk) => received.push(chunk));

    expect(received).toEqual(['buffered']);

    proc.emit('close', 0);
    await promise;
    cleanupRun(42);
  });

  it('getRun returns undefined when run not active', () => {
    expect(getRun(9999)).toBeUndefined();
  });

  it('getRun returns run state after first output', async () => {
    const proc = makeFakeProcess();
    const deps = makeDeps({ spawn: vi.fn().mockReturnValue(proc) });

    const promise = runPrompt(1, deps);
    proc.stdout.emit('data', Buffer.from('x'));
    expect(getRun(42)).toBeDefined();

    proc.emit('close', 0);
    await promise;
    cleanupRun(42);
  });

  it('swallows listener errors without crashing', async () => {
    const proc = makeFakeProcess();
    const deps = makeDeps({ spawn: vi.fn().mockReturnValue(proc) });

    const promise = runPrompt(1, deps);
    onRunOutput(42, () => {
      throw new Error('listener boom');
    });

    // Should not throw
    proc.stdout.emit('data', Buffer.from('data'));
    proc.emit('close', 0);
    await promise;
  });

  it('handles routeOutput rejection without propagating', async () => {
    const proc = makeFakeProcess();
    const deps = makeDeps({
      spawn: vi.fn().mockReturnValue(proc),
      routeOutput: vi.fn().mockRejectedValue(new Error('route failed')),
    });

    const promise = runPrompt(1, deps);
    proc.emit('close', 0);
    // routeOutput rejection should not cause runPrompt to reject
    await expect(promise).resolves.toBeDefined();
  });

  it('rejects when createRun throws synchronously', async () => {
    const deps = makeDeps();
    (deps.persist.createRun as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('DB write failed');
    });

    await expect(runPrompt(1, deps)).rejects.toThrow('DB write failed');
    expect(deps.persist.finishRun).not.toHaveBeenCalled();
  });

  it('live SSE subscriber receives chunks as they arrive', async () => {
    const proc = makeFakeProcess();
    const deps = makeDeps({ spawn: vi.fn().mockReturnValue(proc) });

    const promise = runPrompt(1, deps);

    const received: string[] = [];
    const unsub = onRunOutput(42, (chunk) => received.push(chunk));

    proc.stdout.emit('data', Buffer.from('live1'));
    proc.stdout.emit('data', Buffer.from('live2'));

    expect(received).toEqual(['live1', 'live2']);

    unsub();
    proc.emit('close', 0);
    await promise;
    cleanupRun(42);
  });
});
