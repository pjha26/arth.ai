import { z } from 'zod';

const rating = z.number().int().min(0).max(2);
const ratings = z.object({ citations: rating, uncertainty: rating, usefulness: rating, criticalClaim: z.boolean() });

export const reportQualityReviewSchema = z.object({
  version: z.literal(1),
  reportId: z.string().uuid(),
  generationAttempt: z.number().int().positive(),
  expected: z.enum(['generated', 'insufficient-evidence']),
  actual: z.enum(['generated', 'insufficient-evidence', 'failed']),
  ratings: ratings.nullable(),
  notes: z.string().trim().min(1).max(2000),
}).refine(review => (review.actual === 'generated') === (review.ratings !== null), {
  message: 'Ratings are required for generated reports and empty for cases without a report.',
});

export function summarizeReportQuality(inputs) {
  const reviews = inputs.map(review => reportQualityReviewSchema.parse(review));
  if (!reviews.length) throw new Error('Provide at least one report quality review');
  if (new Set(reviews.map(review => review.reportId)).size !== reviews.length) throw new Error('Include each report only once');

  const generated = reviews.filter(review => review.actual === 'generated');
  const insufficientEvidence = reviews.filter(review => review.actual === 'insufficient-evidence').length;
  const outcomeMismatches = reviews.filter(review => review.expected !== review.actual).length;
  const criticalClaims = generated.filter(review => review.ratings.criticalClaim).length;
  const pilotMinimum = 10;
  const average = criterion => generated.length
    ? generated.reduce((total, review) => total + review.ratings[criterion], 0) / generated.length
    : null;

  return {
    reportsReviewed: reviews.length, generated: generated.length, insufficientEvidence,
    outcomeMismatches, reportsWithCriticalClaims: criticalClaims,
    averageRatingsOutOfTwo: { citations: average('citations'), uncertainty: average('uncertainty'), usefulness: average('usefulness') },
    pilotMinimum,
    pilotGatePassed: reviews.length >= pilotMinimum && generated.length > 0 && insufficientEvidence > 0
      && outcomeMismatches === 0 && criticalClaims === 0,
  };
}
