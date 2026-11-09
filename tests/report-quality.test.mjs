import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeReportQuality } from '../shared/report-quality.js';

function review(index, overrides = {}) {
  return {
    version: 1, reportId: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`, generationAttempt: 1,
    expected: 'generated', actual: 'generated', ratings: { citations: 2, uncertainty: 1, usefulness: 2, criticalClaim: false },
    notes: 'Checked against the fixture evidence.', ...overrides,
  };
}

test('the pilot requires a mix of expected outcomes, enough reports, and no critical claims', () => {
  const cohort = Array.from({ length: 9 }, (_, index) => review(index));
  const sparse = review(9, { expected: 'insufficient-evidence', actual: 'insufficient-evidence', ratings: null });
  assert.equal(summarizeReportQuality(cohort).pilotGatePassed, false);
  assert.equal(summarizeReportQuality([...cohort, review(9)]).pilotGatePassed, false);
  const summary = summarizeReportQuality([...cohort, sparse]);
  assert.equal(summary.pilotGatePassed, true);
  assert.deepEqual(summary.averageRatingsOutOfTwo, { citations: 2, uncertainty: 1, usefulness: 2 });
  assert.equal(summarizeReportQuality([...cohort, { ...sparse, actual: 'failed' }]).pilotGatePassed, false);
  const critical = review(0);
  critical.ratings.criticalClaim = true;
  assert.equal(summarizeReportQuality([critical, ...cohort.slice(1), sparse]).pilotGatePassed, false);
});

test('missing ratings, duplicate reports, and empty reviewer notes are rejected', () => {
  assert.throws(() => summarizeReportQuality([review(0, { ratings: null })]), /Ratings are required/);
  assert.throws(() => summarizeReportQuality([review(0), review(0, { generationAttempt: 2 })]), /each report only once/);
  assert.throws(() => summarizeReportQuality([review(0, { notes: ' ' })]));
});

test('claim coverage and support use separate denominators from legacy review files', () => {
  const claims = [
    { text: 'The company lists an API.', verdict: 'supported', citation: 'company' },
    { text: 'The API is public.', verdict: 'supported', citation: 'none' },
    { text: 'The company has 500 staff.', verdict: 'unsupported', citation: 'company' },
    { text: 'The company is incorporated in Berlin.', verdict: 'contradicted', citation: 'independent' },
    { text: 'Repeated API claim.', verdict: 'excluded', citation: 'company' },
  ];
  const detailed = review(1, { version: 2, claims });
  const summary = summarizeReportQuality([review(0), detailed]);
  assert.deepEqual(summary.claimReview, {
    reportsWithClaimReviews: 1, coversAllGeneratedReports: false, reportsWithoutMaterialClaims: 0, materialClaims: 4, cited: 3, supported: 2,
    unsupported: 1, contradicted: 1, companyCited: 2, independentlyCited: 1, citationCoverage: 0.75, supportRate: 0.5,
  });
  assert.equal(summary.reportsWithCriticalClaims, 1);
  assert.equal(summarizeReportQuality([detailed]).claimReview.coversAllGeneratedReports, true);
  assert.equal(summarizeReportQuality([{ ...detailed, claims: [claims[4]] }]).claimReview.supportRate, null);
  assert.throws(() => summarizeReportQuality([{ ...detailed, claims: [] }]), /Claim reviews are required/);
});
