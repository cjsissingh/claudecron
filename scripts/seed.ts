#!/usr/bin/env node

/**
 * Seed script - Populates database with example prompts
 * Run: npm run seed
 */

import * as db from '../server/db';

interface SeedPrompt {
  name: string;
  prompt_text: string;
  schedule: string;
  output_type: string;
  output_config: Record<string, unknown>;
}

const examplePrompts: SeedPrompt[] = [
  {
    name: 'Daily News Digest',
    prompt_text: `Generate a brief summary of the top 5 technology news stories from today. For each story, provide:
1. A one-sentence headline
2. A 2-3 sentence summary
3. Why it matters

Keep it concise and scannable.`,
    schedule: '0 8 * * *',
    output_type: 'log',
    output_config: {},
  },
  {
    name: 'Weekly Standup Template',
    prompt_text: `Create a helpful standup meeting template for software teams. Include:
- What to cover in updates
- How to keep it concise (15 min max)
- Discussion topics
- Action item tracking

Format as markdown.`,
    schedule: '0 9 * * 1',
    output_type: 'log',
    output_config: {},
  },
  {
    name: 'Code Review Checklist',
    prompt_text: `Generate a comprehensive code review checklist focusing on:
- Security vulnerabilities
- Performance concerns
- Code readability
- Testing coverage
- Documentation
- Best practices

Format as a markdown checklist that developers can use.`,
    schedule: '0 10 * * *',
    output_type: 'log',
    output_config: {},
  },
  {
    name: 'Writing Tips of the Day',
    prompt_text: `Provide 3 unique writing tips for technical writers. Include:
- The tip itself
- Why it matters
- An example

Make it practical and actionable.`,
    schedule: '0 9 * * *',
    output_type: 'log',
    output_config: {},
  },
  {
    name: 'Debugging Guide',
    prompt_text: `Create a step-by-step guide for debugging JavaScript errors. Include:
1. How to read error messages
2. Using browser DevTools
3. Common error types and fixes
4. Best debugging practices

Be practical with real examples.`,
    schedule: '0 14 * * *',
    output_type: 'log',
    output_config: {},
  },
];

console.log('🌱 Seeding database with example prompts...\n');

try {
  const existing = db.getAllPrompts();
  if (existing.length > 0) {
    console.log('ℹ️  Database already has prompts. Skipping seed.');
    process.exit(0);
  }

  examplePrompts.forEach((prompt) => {
    const created = db.createPrompt(
      prompt.name,
      prompt.prompt_text,
      prompt.schedule,
      prompt.output_type,
      prompt.output_config
    );
    console.log(`✅ Created: "${created.name}"`);
  });

  console.log(`\n✨ Successfully seeded ${examplePrompts.length} example prompts!`);
  console.log('\nNow run:');
  console.log('  npm start');
  console.log('\nThen visit: http://localhost:3000\n');
  process.exit(0);
} catch (error) {
  console.error('❌ Error seeding database:', (error as Error).message);
  process.exit(1);
}
