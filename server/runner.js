const { spawn } = require('child_process');
const db = require('./db');
const router = require('./router');

// Map to track active runs for SSE streaming
const activeRuns = new Map();

// Event listeners for each run
function getRun(runId) {
  if (!activeRuns.has(runId)) {
    activeRuns.set(runId, {
      listeners: [],
      buffer: ''
    });
  }
  return activeRuns.get(runId);
}

function onRunOutput(runId, callback) {
  const run = getRun(runId);
  run.listeners.push(callback);
  // Send buffered output immediately
  if (run.buffer) {
    callback(run.buffer);
  }
  return () => {
    run.listeners = run.listeners.filter(l => l !== callback);
  };
}

function emitOutput(runId, chunk) {
  const run = getRun(runId);
  run.buffer += chunk;
  run.listeners.forEach(listener => {
    try {
      listener(chunk);
    } catch (e) {
      console.error('Error in output listener:', e);
    }
  });
}

function cleanupRun(runId) {
  activeRuns.delete(runId);
}

async function runPrompt(promptId) {
  const prompt = db.getPrompt(promptId);
  if (!prompt) {
    throw new Error(`Prompt ${promptId} not found`);
  }

  // Create a run record
  const runId = db.createRun(promptId);
  const run = db.getRun(runId);

  console.log(`[Run ${runId}] Starting prompt: ${prompt.name}`);

  try {
    const config = db.getConfig();
    const claudePath = config.claudePath || 'claude';

    return new Promise((resolve, reject) => {
      // Spawn the Claude CLI process
      const child = spawn(claudePath, ['-p', prompt.prompt_text, '--dangerously-skip-permissions'], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        db.appendRunOutput(runId, chunk);
        emitOutput(runId, chunk);
      });

      child.stderr.on('data', (data) => {
        const chunk = data.toString();
        errorOutput += chunk;
        db.appendRunOutput(runId, chunk);
        emitOutput(runId, chunk);
      });

      child.on('close', (code) => {
        const status = code === 0 ? 'success' : 'error';
        const errorMsg = code === 0 ? null : `Process exited with code ${code}${errorOutput ? ': ' + errorOutput : ''}`;

        console.log(`[Run ${runId}] Completed with status: ${status}`);

        // Update run record
        db.finishRun(runId, status, errorMsg);

        // Route output
        try {
          router.routeOutput(prompt, output, status, errorMsg);
        } catch (e) {
          console.error('Error routing output:', e);
        }

        // Cleanup
        emitOutput(runId, '\n[DONE]');
        setTimeout(() => cleanupRun(runId), 5000);

        if (status === 'success') {
          resolve({ runId, output, status: 'success' });
        } else {
          reject(new Error(errorMsg || `Process exited with code ${code}`));
        }
      });

      child.on('error', (error) => {
        console.error(`[Run ${runId}] Error spawning process:`, error);
        const errorMsg = error.message;
        db.finishRun(runId, 'error', errorMsg);
        emitOutput(runId, `\nError: ${errorMsg}\n[DONE]`);
        setTimeout(() => cleanupRun(runId), 5000);
        reject(error);
      });
    });
  } catch (error) {
    console.error(`[Run ${runId}] Error:`, error);
    db.finishRun(runId, 'error', error.message);
    emitOutput(runId, `\nError: ${error.message}\n[DONE]`);
    setTimeout(() => cleanupRun(runId), 5000);
    throw error;
  }
}

module.exports = {
  runPrompt,
  onRunOutput,
  cleanupRun,
  getRun
};
