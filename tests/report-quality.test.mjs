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
