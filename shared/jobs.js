import { z } from 'zod';

export const personaSchema = z.enum(['founder', 'cto', 'marketer', 'general']);
export const reportJobSchema = z.object({
  reportId: z.string().uuid(), companyId: z.string().uuid(), leadId: z.string().uuid(),
  jobId: z.string().uuid(), submittedAt: z.string().datetime(),
  leadInput: z.object({
    id: z.string().uuid(), fullName: z.string().nullable(), email: z.string().email().nullable(),
    website: z.string().url(), companyName: z.string().min(1), industry: z.string(), companySize: z.string(),
    personaType: personaSchema, challengeTags: z.array(z.string().max(100)).max(10), painPoints: z.string().max(3000),
  }),
});

export function makeReportJob(report, lead, company) {
  if (report.leadId !== lead.id || lead.companyId !== company.id || report.companyId !== company.id) throw new Error("Report, lead, and company do not match");
  return reportJobSchema.parse({
    reportId: report.id, companyId: company.id, leadId: lead.id, jobId: report.id,
    submittedAt: report.createdAt.toISOString(),
    leadInput: { id: lead.id, fullName: lead.fullName, email: lead.email,
      website: company.website || `https://${company.domain}`, companyName: company.name,
      industry: company.industry || 'Unknown', companySize: company.size || 'Unknown',
      personaType: report.personaType.toLowerCase(), challengeTags: lead.challengeTags || [], painPoints: lead.painPoints },
  });
}

export function reportChunks(lead, report) {
  return [
    `Company: ${lead.companyName}\nIndustry: ${lead.industry}\nPersona: ${lead.personaType}\nStated challenge: ${lead.painPoints}\nExecutive summary: ${report.executiveSummary || ''}`,
    ...(report.painPoints || []).map(p => `Pain point: ${typeof p === 'string' ? p : p.text}`),
    ...(report.aiOpportunities || []).map(p => `Opportunity: ${p.title}\n${p.description}\nEvidence: ${(p.evidence || []).join('; ')}`),
    ...(report.recommendedNextSteps || []).map(p => `Next step: ${typeof p === 'string' ? p : p.content}`),
    ...(report.sources || []).map(s => `[${s.id}] ${s.url}\n${s.excerpt}`),
  ].filter(Boolean);
}
