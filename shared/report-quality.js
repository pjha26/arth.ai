import { z } from 'zod';

const rating = z.number().int().min(0).max(2);
const ratings = z.object({ citations: rating, uncertainty: rating, usefulness: rating });
const claimReview = z.object({
  text: z.string().trim().min(1),
  verdict: z.enum(['supported', 'unsupported', 'contradicted', 'excluded']),
  citation: z.enum(['none', 'company', 'independent', 'unclear']),
});

const reviewFields = z.object({
  reportId: z.string().uuid(),
  generationAttempt: z.number().int().positive(),
  expected: z.enum(['generated', 'insufficient-evidence']),
  actual: z.enum(['generated', 'insufficient-evidence', 'failed']),
  notes: z.string().trim().min(1).max(2000),
});

export const reportQualityReviewSchema = z.discriminatedUnion('version', [
  reviewFields.extend({ version: z.literal(1), ratings: ratings.extend({ criticalClaim: z.boolean() }).nullable() }),
  reviewFields.extend({ version: z.literal(2), ratings: ratings.nullable(), claims: z.array(claimReview) }),
]).refine(review => (review.actual === 'generated') === (review.ratings !== null), {
  message: 'Ratings are required for generated reports and empty for cases without a report.',
}).refine(review => review.version === 1 || (review.actual === 'generated') === (review.claims.length > 0), {
  message: 'Claim reviews are required for generated reports and empty for cases without a report.',
});

export function summarizeReportQuality(inputs) {
  const reviews = inputs.map(review => reportQualityReviewSchema.parse(review));
  if (!reviews.length) throw new Error('Provide at least one report quality review');
  if (new Set(reviews.map(review => review.reportId)).size !== reviews.length) throw new Error('Include each report only once');

  const generated = reviews.filter(review => review.actual === 'generated');
  const insufficientEvidence = reviews.filter(review => review.actual === 'insufficient-evidence').length;
  const outcomeMismatches = reviews.filter(review => review.expected !== review.actual).length;
  const criticalClaims = generated.filter(review => review.version === 1 ? review.ratings.criticalClaim
    : review.claims.some(claim => claim.verdict === 'unsupported' || claim.verdict === 'contradicted')).length;
  const claimReviewedReports = generated.filter(review => review.version === 2);
  const reportsWithoutMaterialClaims = claimReviewedReports.filter(review => review.claims.every(claim => claim.verdict === 'excluded')).length;
  const claims = claimReviewedReports.flatMap(review => review.claims).filter(claim => claim.verdict !== 'excluded');
  const cited = claims.filter(claim => claim.citation !== 'none').length;
  const supported = claims.filter(claim => claim.verdict === 'supported').length;
  const pilotMinimum = 10;
  const average = criterion => generated.length
    ? generated.reduce((total, review) => total + review.ratings[criterion], 0) / generated.length
    : null;

  return {
    reportsReviewed: reviews.length, generated: generated.length, insufficientEvidence,
    outcomeMismatches, reportsWithCriticalClaims: criticalClaims,
    averageRatingsOutOfTwo: { citations: average('citations'), uncertainty: average('uncertainty'), usefulness: average('usefulness') },
    claimReview: {
      reportsWithClaimReviews: claimReviewedReports.length,
      coversAllGeneratedReports: generated.length > 0 && claimReviewedReports.length === generated.length && reportsWithoutMaterialClaims === 0,
      reportsWithoutMaterialClaims,
      materialClaims: claims.length, cited, supported,
      unsupported: claims.filter(claim => claim.verdict === 'unsupported').length,
      contradicted: claims.filter(claim => claim.verdict === 'contradicted').length,
      companyCited: claims.filter(claim => claim.citation === 'company').length,
      independentlyCited: claims.filter(claim => claim.citation === 'independent').length,
      citationCoverage: claims.length ? cited / claims.length : null,
      supportRate: claims.length ? supported / claims.length : null,
    },
    pilotMinimum,
    pilotGatePassed: reviews.length >= pilotMinimum && generated.length > 0 && insufficientEvidence > 0
      && outcomeMismatches === 0 && criticalClaims === 0 && reportsWithoutMaterialClaims === 0,
  };
}
