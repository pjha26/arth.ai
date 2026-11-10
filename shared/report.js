import { z } from 'zod';

export const INSUFFICIENT_RESEARCH_EVIDENCE = 'Insufficient public website evidence to produce a report';

export const sourceSchema = z.object({ id: z.string(), url: z.string().url(), title: z.string(), excerpt: z.string().min(1), retrievedAt: z.string().datetime(), publishedAt: z.string().datetime().nullable() });
const insight = { confidence: z.number().min(0).max(1), evidence: z.array(z.string()), category: z.enum(['verified', 'inferred', 'speculative']) };
export const reportSchema = z.object({
  executiveSummary: z.string(),
  marketPosition: z.object({ reasoning: z.string(), content: z.string() }),
  techStack: z.array(z.string()), fundingStage: z.string(), digitalPresence: z.string(),
  painPoints: z.array(z.object({ text: z.string(), ...insight })).min(1).max(5),
  aiOpportunities: z.array(z.object({ title: z.string(), description: z.string(), impact: z.enum(['High','Medium','Low']), ...insight })).min(1).max(5),
  recommendedNextSteps: z.array(z.object({ reasoning: z.string(), content: z.string() })).min(1).max(5),
  auditScores: z.object({
    digitalReadiness: z.number().int().min(1).max(10), digitalReadinessReason: z.string(),
    automationPotential: z.number().int().min(1).max(10), automationPotentialReason: z.string(),
    growthIndex: z.number().int().min(1).max(10), growthIndexReason: z.string(),
  }),
  claims: z.array(z.object({ text: z.string(), sourceId: z.string(), quote: z.string().min(10) })).min(1).max(20),
  signals: z.array(z.object({ type: z.string(), data: z.string(), severity: z.enum(['high','medium','low']) })).max(10),
});

export function validateEvidence(report, sources) {
  const ids = new Set(sources.map(s => s.id));
  const normalize = s => s.replace(/\s+/g, ' ').trim().toLowerCase();
  for (const claim of report.claims) {
    const source = sources.find(s => s.id === claim.sourceId);
    if (!source || !normalize(source.excerpt).includes(normalize(claim.quote))) throw new Error('A report claim has no matching source excerpt');
  }
  for (const item of [...report.painPoints, ...report.aiOpportunities]) {
    if (item.evidence.some(id => !ids.has(id))) throw new Error('Invalid evidence reference');
    if (item.category === 'verified' && !item.evidence.length) throw new Error('Verified findings require evidence');
  }
}

export function readinessScore(report) {
  const s = report.auditScores;
  return Math.round((s.digitalReadiness + s.automationPotential + s.growthIndex) / 3 * 10);
}
