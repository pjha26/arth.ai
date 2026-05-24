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

export const personaOptions = ["Founder", "CTO", "Marketer"] as const;

// Helper to block common free email domains
const freeEmailDomains = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com", "icloud.com"
];

export const LeadSchema = z.object({
  fullName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long"),
  email: z
    .string()
    .email("Please enter a valid email"),
  
  // These fields are now optional from the frontend, but we keep them in schema
  // in case they are provided or filled in by the backend fallback.
  companyName: z.string().max(200, "Company name too long").optional(),
  industry: z.enum(industryOptions).optional(),
  companySize: z.enum(companySizeOptions).optional(),
  
  website: z
    .string()
    .url("Enter a valid website URL including https://")
    .max(500),
    
  personaType: z.enum(personaOptions),
  
  challengeTags: z.array(z.string()).min(1, "Please select at least one challenge"),
  
  painPoints: z
    .string()
    .max(1000, "Please keep it under 1000 characters")
    .optional(),
});

export type Lead = z.infer<typeof LeadSchema>;

// Step-level schemas for progressive validation
export const Step1Schema = LeadSchema.pick({
  fullName: true,
  email: true,
});

export const Step2Schema = LeadSchema.pick({
  website: true,
  personaType: true,
});

export const Step3Schema = LeadSchema.pick({
  challengeTags: true,
  painPoints: true,
});
