import { z } from 'zod';

const sourceId = z.string().trim().min(1).max(128);
const caseSchema = z.object({
  id: sourceId,
  expectedSourceIds: z.array(sourceId).max(100),
  retrievedSourceIds: z.array(sourceId).max(3),
  abstained: z.boolean(),
  claims: z.array(z.object({ citedSourceId: sourceId.nullable(), supported: z.boolean() })).max(100),
}).strict().refine(row => row.claims.every(claim => !claim.supported || claim.citedSourceId !== null),
  'A supported claim needs a cited source reviewed against the original excerpt');

export function summarizeChatQuality(input) {
  const cases = z.array(caseSchema).min(1).max(1000).parse(input);
  if (new Set(cases.map(row => row.id)).size !== cases.length) throw new Error('Case IDs must be unique');
  const totals = { expectedSources: 0, retrievedExpectedSources: 0, factualClaims: 0, citedClaims: 0,
    supportedClaims: 0, unanswerableCases: 0, unanswerableAbstentions: 0, answerableCases: 0, answerableAbstentions: 0 };
  for (const row of cases) {
    const expected = new Set(row.expectedSourceIds);
    const retrieved = new Set(row.retrievedSourceIds);
    totals.expectedSources += expected.size;
    totals.retrievedExpectedSources += [...expected].filter(source => retrieved.has(source)).length;
    totals.factualClaims += row.claims.length;
    totals.citedClaims += row.claims.filter(claim => claim.citedSourceId !== null).length;
    totals.supportedClaims += row.claims.filter(claim => claim.supported).length;
    if (expected.size) {
      totals.answerableCases++;
      if (row.abstained) totals.answerableAbstentions++;
    } else {
      totals.unanswerableCases++;
      if (row.abstained) totals.unanswerableAbstentions++;
    }
  }
  const rate = (count, total) => total ? count / total : null;
  return {
    cases: cases.length,
    ...totals,
    evidenceRecallAt3: rate(totals.retrievedExpectedSources, totals.expectedSources),
    citationCoverage: rate(totals.citedClaims, totals.factualClaims),
    supportedClaimRate: rate(totals.supportedClaims, totals.factualClaims),
    unanswerableAbstentionRate: rate(totals.unanswerableAbstentions, totals.unanswerableCases),
    answerableAbstentionRate: rate(totals.answerableAbstentions, totals.answerableCases),
  };
}
