import type { Lead } from "./validation";

export type { Lead };

export interface EnrichedData {
  logo?: string;
  domain?: string;
  description?: string;
  founded?: string;
  headquarters?: string;
  websiteTitle?: string;
  websiteDescription?: string;
  employees?: string;
  rawContext: string;
}

export interface AuditScore {
  digitalReadiness: number;
  automationPotential: number;
  growthIndex: number;
}

export interface AiOpportunity {
  title: string;
  description: string;
  impact: "High" | "Medium" | "Low";
}

export interface AiReport {
  executiveSummary: string;
  marketPosition: string;
  digitalPresence: string;
  painPoints: string[];
  aiOpportunities: AiOpportunity[];
  recommendedNextSteps: string[];
  auditScores: AuditScore;
}

export interface JobData {
  lead: Lead;
  jobId: string;
  submittedAt: string;
}
