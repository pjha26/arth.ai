import type { z } from 'zod';
import type { reportSchema } from '@/shared/report.js';

export type ReportInsights = Partial<z.infer<typeof reportSchema>> & {
  verificationNote?: string;
  visualIntelligence?: { designMaturity: string; uxQualitySignals: string[]; conversionGaps: string[]; companyStageSignal: string };
};
export interface ReportView {
  id: string; score: number | null; status: string; personaType: string;
  insights: ReportInsights | null;
  company: { name: string; industry: string | null; signals?: { severity: string; type: string; detectedAt: string; data?: { message?: string } }[] };
}
export interface CRMReport extends ReportView {
  companyName: string; email: string; fullName: string; painPoints: string; website: string;
  industry: string | null; companySize: string | null; createdAt: string;
  intentProbability: number | null; intentStatus: string; verificationStatus: string; artifactStatus: string; deliveryStatus: string;
  salesStatus: string;
}
export interface Analytics {
  overview: { totalLeads: number; generated: number; failed: number; avgReportScore: number | null; mostCommonIndustry: string; topPersona: string; peakSubmissionDay: string };
  industryBreakdown: { name: string; count: number }[];
  personaPerformance: { persona: string; count: number; avgScore: number | null; conversionRate: string }[];
  signalHeatmap: Record<string, number>; sparks: { leads: number[]; generated: number[]; failed: number[] }; trendIntelligence: string;
}
export interface DiscoveryRecord {
  id: string; industry: string; region: string; status: string; createdAt: string;
  companies?: { id: string; name: string; domain: string | null; source: string; confidenceTier: string; status: string; fitScore: number | null; fitReasons: string[] | null }[];
}
export interface PreviewData { companyName: string; domain: string; industry: string; insights: string[]; sourceUrl: string }
