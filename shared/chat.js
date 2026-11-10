import { z } from 'zod';

const message = z.object({
  id: z.string().max(100).optional(), role: z.enum(['user', 'assistant']),
  content: z.string().max(8000).optional(),
  parts: z.array(z.union([z.object({ type: z.literal('text'), text: z.string().max(8000) }), z.object({ type: z.literal('step-start') })])).max(10).optional(),
});
export const chatSchema = z.object({ messages: z.array(message).min(1).max(100), model: z.string().max(80).optional() })
  .refine(body => body.messages.at(-1).role === 'user', 'Last message must be from the user');

export function latestText(body) {
  const last = body.messages.at(-1);
  const text = (last.content || last.parts?.filter(p => p.type === 'text').map(p => p.text).join('') || '').trim();
  if (!text || text.length > 2000) throw new Error('Enter a message of 1–2000 characters');
  return text;
}

export function uiMessage(row) {
  return { id: row.id, role: row.role, parts: [{ type: 'text', text: row.content }] };
}

// Inspect a tee before committing HTTP headers; later failures remain explicit stream errors.
export async function waitForFirstText(result) {
  const reader = result.fullStream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) throw new Error('Model returned no answer');
      if (value.type === 'error') throw value.error;
      if (value.type === 'text-delta' && value.text) return result;
    }
  } finally { void reader.cancel().catch(() => {}); }
}

export function validProbability(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}
