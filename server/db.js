const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Create data directory if it doesn't exist
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'claudecron.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
function initDatabase() {
  // Create prompts table
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

  // Create runs table
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

  // Create config table (for storing global configuration)
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `);

  // Ensure default config values exist
  const defaultConfig = {
    claudePath: 'claude',
    smtpHost: '',
    smtpPort: '465',
    smtpSecure: '1',
    smtpUser: '',
    smtpPassword: '',
    defaultFrom: ''
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
const operations = {
  // Prompts
  getAllPrompts() {
    return db.prepare('SELECT * FROM prompts ORDER BY created_at DESC').all();
  },

  getPrompt(id) {
    const prompt = db.prepare('SELECT * FROM prompts WHERE id = ?').get(id);
    if (prompt && prompt.output_config) {
      try {
        prompt.output_config = JSON.parse(prompt.output_config);
      } catch (e) {
        prompt.output_config = {};
      }
    }
    return prompt;
  },

  createPrompt(name, promptText, schedule, outputType, outputConfig) {
    const configStr = typeof outputConfig === 'string' ? outputConfig : JSON.stringify(outputConfig || {});
    const stmt = db.prepare(`
      INSERT INTO prompts (name, prompt_text, schedule, output_type, output_config, enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    const result = stmt.run(name, promptText, schedule, outputType, configStr);
    return this.getPrompt(result.lastInsertRowid);
  },

  updatePrompt(id, name, promptText, schedule, outputType, outputConfig, enabled) {
    const configStr = typeof outputConfig === 'string' ? outputConfig : JSON.stringify(outputConfig || {});
    db.prepare(`
      UPDATE prompts
      SET name = ?, prompt_text = ?, schedule = ?, output_type = ?, output_config = ?, enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(name, promptText, schedule, outputType, configStr, enabled ? 1 : 0, id);
    return this.getPrompt(id);
  },

  deletePrompt(id) {
    db.prepare('DELETE FROM prompts WHERE id = ?').run(id);
  },

  // Runs
  createRun(promptId) {
    const stmt = db.prepare(`
      INSERT INTO runs (prompt_id, started_at, status, output)
      VALUES (?, CURRENT_TIMESTAMP, 'running', '')
    `);
    const result = stmt.run(promptId);
    return result.lastInsertRowid;
  },

  getRun(id) {
    return db.prepare('SELECT * FROM runs WHERE id = ?').get(id);
  },

  getRunHistory(promptId, limit = 50) {
    return db.prepare(`
      SELECT * FROM runs WHERE prompt_id = ? ORDER BY started_at DESC LIMIT ?
    `).all(promptId, limit);
  },

  appendRunOutput(runId, chunk) {
    const run = this.getRun(runId);
    const newOutput = (run.output || '') + chunk;
    db.prepare('UPDATE runs SET output = ? WHERE id = ?').run(newOutput, runId);
  },

  finishRun(runId, status, error = null) {
    db.prepare(`
      UPDATE runs SET finished_at = CURRENT_TIMESTAMP, status = ?, error = ? WHERE id = ?
    `).run(status, error, runId);
  },

  // Config
  getConfig() {
    const rows = db.prepare('SELECT key, value FROM config').all();
    const config = {};
    rows.forEach(row => {
      config[row.key] = row.value;
    });
    return {
      claudePath: config.claudePath || 'claude',
      smtp: {
        host: config.smtpHost || '',
        port: parseInt(config.smtpPort || '465'),
        secure: config.smtpSecure === '1',
        user: config.smtpUser || '',
        password: config.smtpPassword || ''
      },
      defaultFrom: config.defaultFrom || ''
    };
  },

  setConfigValue(key, value) {
    const stmt = db.prepare('SELECT value FROM config WHERE key = ?');
    if (stmt.get(key)) {
      db.prepare('UPDATE config SET value = ? WHERE key = ?').run(value, key);
    } else {
      db.prepare('INSERT INTO config (key, value) VALUES (?, ?)').run(key, value);
    }
  },

  updateConfig(config) {
    this.setConfigValue('claudePath', config.claudePath);
    this.setConfigValue('smtpHost', config.smtp?.host || '');
    this.setConfigValue('smtpPort', String(config.smtp?.port || '465'));
    this.setConfigValue('smtpSecure', config.smtp?.secure ? '1' : '0');
    this.setConfigValue('smtpUser', config.smtp?.user || '');
    this.setConfigValue('smtpPassword', config.smtp?.password || '');
    this.setConfigValue('defaultFrom', config.defaultFrom || '');
  }
};

module.exports = { db, ...operations };
