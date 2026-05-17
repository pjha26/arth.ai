import { z } from "zod";

export const industryOptions = [
  "SaaS / Software",
  "FinTech / Finance",
  "HealthTech / Healthcare",
  "E-commerce / Retail",
  "Consulting / Professional Services",
  "Marketing / Advertising",
  "EdTech / Education",
  "Legal / LegalTech",
  "Real Estate / PropTech",
  "Manufacturing / Supply Chain",
  "HR / Recruitment",
  "Media / Content",
  "Logistics / Transportation",
  "CleanTech / Energy",
  "Other",
] as const;

export const companySizeOptions = [
  "1–10 employees",
  "11–50 employees",
  "51–200 employees",
  "201–1,000 employees",
  "1,000+ employees",
] as const;

export const LeadSchema = z.object({
  fullName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long"),
  email: z.string().email("Please enter a valid business email"),
  companyName: z
    .string()
    .min(1, "Company name is required")
    .max(200, "Company name too long"),
  website: z
    .string()
    .url("Please enter a valid URL (include https://)")
    .max(500),
  industry: z.enum(industryOptions, "Please select an industry"),
  companySize: z.enum(companySizeOptions, "Please select company size"),
  painPoints: z
    .string()
    .min(10, "Please describe your challenge in at least 10 characters")
    .max(1000, "Please keep it under 1000 characters"),
});

export type Lead = z.infer<typeof LeadSchema>;

// Step-level schemas for progressive validation
export const Step1Schema = LeadSchema.pick({
  fullName: true,
  email: true,
  companyName: true,
});

export const Step2Schema = LeadSchema.pick({
  website: true,
  industry: true,
  companySize: true,
});

export const Step3Schema = LeadSchema.pick({
  painPoints: true,
});
