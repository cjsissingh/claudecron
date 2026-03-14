import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface Prompt {
  id: number;
  name: string;
  prompt_text: string;
  schedule: string;
  output_type: string;
  output_config: Record<string, unknown> | string | null;
  enabled: number | boolean;
  created_at: string;
  updated_at: string;
}

export interface Run {
  id: number;
  prompt_id: number;
  started_at: string;
  finished_at: string | null;
  status: string;
  output: string | null;
  error: string | null;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
}

export interface AppConfig {
  claudePath: string;
  smtp: SmtpConfig;
  defaultFrom: string;
}

// Create data directory if it doesn't exist
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'claudecron.db');
export const db: DatabaseType = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      prompt_text TEXT NOT NULL,
      schedule TEXT NOT NULL,
      output_type TEXT NOT NULL DEFAULT 'log',
      output_config TEXT,
      enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt_id INTEGER NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME,
      status TEXT DEFAULT 'running',
      output TEXT,
      error TEXT,
      FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  const defaultConfig: Record<string, string> = {
    claudePath: 'claude',
    smtpHost: '',
    smtpPort: '587',
    smtpSecure: '0',
    smtpUser: '',
    smtpPassword: '',
    defaultFrom: '',
  };

  for (const [key, value] of Object.entries(defaultConfig)) {
    const stmt = db.prepare('SELECT value FROM config WHERE key = ?');
    if (!stmt.get(key)) {
      db.prepare('INSERT INTO config (key, value) VALUES (?, ?)').run(key, value);
    }
  }
}

initDatabase();

// Database operations
export function getAllPrompts(): Prompt[] {
  return db.prepare('SELECT * FROM prompts ORDER BY created_at DESC').all() as Prompt[];
}

export function getPrompt(id: number): Prompt | undefined {
  const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(id) as Prompt | undefined;
  if (prompt && prompt.output_config && typeof prompt.output_config === 'string') {
    try {
      prompt.output_config = JSON.parse(prompt.output_config) as Record<string, unknown>;
    } catch {
      prompt.output_config = {};
    }
  }
  return prompt;
}

export function createPrompt(
  name: string,
  promptText: string,
  schedule: string,
  outputType: string,
  outputConfig: Record<string, unknown> | string | null
): Prompt {
  const configStr =
    typeof outputConfig === 'string' ? outputConfig : JSON.stringify(outputConfig || {});
  const stmt = db.prepare(`
    INSERT INTO prompts (name, prompt_text, schedule, output_type, output_config, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  const result = stmt.run(name, promptText, schedule, outputType, configStr);
  return getPrompt(result.lastInsertRowid as number)!;
}

export function updatePrompt(
  id: number,
  name: string,
  promptText: string,
  schedule: string,
  outputType: string,
  outputConfig: Record<string, unknown> | string | null,
  enabled: boolean | number
): Prompt {
  const configStr =
    typeof outputConfig === 'string' ? outputConfig : JSON.stringify(outputConfig || {});
  db.prepare(`
    UPDATE prompts
    SET name = ?, prompt_text = ?, schedule = ?, output_type = ?, output_config = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(name, promptText, schedule, outputType, configStr, enabled ? 1 : 0, id);
  return getPrompt(id)!;
}

export function deletePrompt(id: number): void {
  db.prepare('DELETE FROM prompts WHERE id = ?').run(id);
}

export function createRun(promptId: number): number {
  const stmt = db.prepare(`
    INSERT INTO runs (prompt_id, started_at, status, output)
    VALUES (?, CURRENT_TIMESTAMP, 'running', '')
  `);
  const result = stmt.run(promptId);
  return result.lastInsertRowid as number;
}

export function getRun(id: number): Run | undefined {
  return db.prepare('SELECT * FROM runs WHERE id = ?').get(id) as Run | undefined;
}

export function getRunHistory(promptId: number, limit = 50): Run[] {
  return db
    .prepare('SELECT * FROM runs WHERE prompt_id = ? ORDER BY started_at DESC LIMIT ?')
    .all(promptId, limit) as Run[];
}

export function appendRunOutput(runId: number, chunk: string): void {
  const run = getRun(runId);
  if (!run) throw new Error(`Unable to find run ${runId}`);
  const newOutput = (run.output || '') + chunk;
  db.prepare('UPDATE runs SET output = ? WHERE id = ?').run(newOutput, runId);
}

export function finishRun(runId: number, status: string, error: string | null = null): void {
  db.prepare(`
    UPDATE runs SET finished_at = CURRENT_TIMESTAMP, status = ?, error = ? WHERE id = ?
  `).run(status, error, runId);
}

export function getConfig(): AppConfig {
  const rows = db.prepare('SELECT key, value FROM config').all() as { key: string; value: string }[];
  const config: Record<string, string> = {};
  rows.forEach((row) => {
    config[row.key] = row.value;
  });
  return {
    claudePath: config['claudePath'] || 'claude',
    smtp: {
      host: config['smtpHost'] || '',
      port: parseInt(config['smtpPort'] || '465'),
      secure: config['smtpSecure'] === '1',
      user: config['smtpUser'] || '',
      password: config['smtpPassword'] || '',
    },
    defaultFrom: config['defaultFrom'] || '',
  };
}

export function setConfigValue(key: string, value: string): void {
  const stmt = db.prepare('SELECT value FROM config WHERE key = ?');
  if (stmt.get(key)) {
    db.prepare('UPDATE config SET value = ? WHERE key = ?').run(value, key);
  } else {
    db.prepare('INSERT INTO config (key, value) VALUES (?, ?)').run(key, value);
  }
}

export function updateConfig(config: AppConfig): void {
  setConfigValue('claudePath', config.claudePath);
  setConfigValue('smtpHost', config.smtp?.host || '');
  setConfigValue('smtpPort', String(config.smtp?.port || '465'));
  setConfigValue('smtpSecure', config.smtp?.secure ? '1' : '0');
  setConfigValue('smtpUser', config.smtp?.user || '');
  setConfigValue('smtpPassword', config.smtp?.password || '');
  setConfigValue('defaultFrom', config.defaultFrom || '');
}
