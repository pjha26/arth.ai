import { z } from 'zod';

const nextAction = z.string().trim().min(1).max(500);
const nextActionOn = z.string().date().nullable();
const id = z.string().uuid();
const version = z.number().int().min(1).max(2147483646);

export const createDeal = z.object({
  id, reportId: id, title: z.string().trim().min(1).max(150), nextAction, nextActionOn,
}).strict();

export const editDeal = z.union([
  z.object({ id, version, stage: z.literal('open'), nextAction, nextActionOn }).strict(),
  z.object({ id, version, stage: z.enum(['won', 'lost']), outcomeReason: z.string().trim().min(1).max(500) }).strict(),
]);

export const dealsEnabled = () => process.env.ENABLE_DEAL_TRACKING === 'true' && process.env.ENABLE_LEAD_QUALIFICATION === 'true';
