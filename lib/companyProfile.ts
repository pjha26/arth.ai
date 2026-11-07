import { cache } from 'react';

export const buildCompanyProfile = cache(async (slug: string) => {
  if (!/^[a-z0-9-]{2,60}$/i.test(slug)) throw new Error('Invalid company slug');
  const name = slug.replaceAll('-', ' ').replace(/\b\w/g, char => char.toUpperCase());
  return {
    name,
    industry: 'Company research',
    headline: `Request an evidence-backed report for ${name}`,
    description: 'This request page has not verified the company identity or website. Enter the official website in the form before research begins.',
    painPoints: ['Which workflow would you like to improve?', 'What constraints or challenges should the research consider?', 'Which outcomes would make a pilot useful?'],
    aiOpportunities: ['Research draws on cited public website excerpts.', 'Recommendations reflect your stated role and challenge.', 'Proposed benefits remain hypotheses until you measure them.'],
    ctaLine: 'Provide your company website and challenge to start a private report request.',
  };
});
