import cron from 'node-cron';

export function validateCronExpression(schedule: string): boolean {
  return cron.validate(schedule);
}

export function validatePromptFields(body: unknown): { valid: boolean; error?: string } {
  const b = body as Record<string, unknown>;
  if (!b['name']) return { valid: false, error: 'name is required' };
  if (!b['prompt_text']) return { valid: false, error: 'prompt_text is required' };
  if (!b['schedule']) return { valid: false, error: 'schedule is required' };
  if (!b['output_type']) return { valid: false, error: 'output_type is required' };
  return { valid: true };
}
