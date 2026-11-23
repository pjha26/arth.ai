import { z } from 'zod';
import { INSUFFICIENT_RESEARCH_EVIDENCE } from '@/shared/report.js';

export const leadQualificationInput = z.object({
  decision: z.enum(['qualified', 'needs_evidence', 'rejected']),
  reason: z.string().trim().min(1).max(500),
  generationAttempt: z.number().int().positive(),
  sourceIds: z.array(z.string().min(1).max(160)).max(20),
}).strict().refine(input => new Set(input.sourceIds).size === input.sourceIds.length
  && (input.decision !== 'qualified' || input.sourceIds.length > 0));

export function canQualifyLead(report: { leadId: string | null; status: string; errorMessage: string | null }) {
  return Boolean(report.leadId && (report.status === 'done'
    || (report.status === 'failed' && report.errorMessage === INSUFFICIENT_RESEARCH_EVIDENCE)));
}
