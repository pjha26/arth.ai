import test from 'node:test';
import assert from 'node:assert/strict';
import { measureModelCall, usageValues } from '../shared/usage.js';
import { summarizeOperations } from '../shared/operations.js';

test('usage estimates require valid account rates and known token counts', () => {
  const before = process.env.AI_MODEL_PRICES;
  try {
    delete process.env.AI_MODEL_PRICES;
    assert.equal(usageValues({ inputTokens: 1000, outputTokens: 500 }, 'google', 'test').estimatedCostUSD, null);
    process.env.AI_MODEL_PRICES = JSON.stringify({ 'google:test': { inputPerMillionUSD: 2, outputPerMillionUSD: 4 } });
    assert.equal(usageValues({ inputTokens: 1000, outputTokens: 500 }, 'google', 'test').estimatedCostUSD, 0.004);
    assert.equal(usageValues(undefined, 'google', 'test').inputTokens, null);
    assert.deepEqual(usageValues({ tokens: 10 }, 'google', 'unknown'), { inputTokens: 10, outputTokens: 0, estimatedCostUSD: null });
    process.env.AI_MODEL_PRICES = '{invalid';
    assert.equal(usageValues({ inputTokens: 1, outputTokens: 1 }, 'google', 'test').estimatedCostUSD, null);
  } finally { if (before === undefined) delete process.env.AI_MODEL_PRICES; else process.env.AI_MODEL_PRICES = before; }
});

test('successful and failed operations are metered without recording prompts or retrying model calls', async () => {
  const rows = [], prisma = { modelCall: { create: async ({ data }) => rows.push(data) } };
  const metadata = { reportId: 'report', provider: 'google', model: 'test', operation: 'writer', prompt: 'Private text must not be stored' };
  let calls = 0;
  await measureModelCall(prisma, metadata, async () => { calls++; return { object: {}, usage: { inputTokens: 20, outputTokens: 30 } }; });
  await assert.rejects(measureModelCall(prisma, metadata, async () => { calls++; throw new Error('Provider failed'); }), /Provider failed/);
  assert.equal(calls, 2); assert.deepEqual(rows.map(row => row.status), ['success', 'failed']);
  assert.equal(rows[0].inputTokens, 20); assert.equal(rows[1].inputTokens, null); assert.ok(!JSON.stringify(rows).includes('Private text'));
  prisma.modelCall.create = async () => { throw new Error('Telemetry unavailable'); };
  const result = await measureModelCall(prisma, metadata, async () => { calls++; return { object: 'completed' }; });
  assert.equal(result.object, 'completed'); assert.equal(calls, 3);
});

test('operations use measured completion times and expose unknown usage and cost', () => {
  const reports = [1000, 2000, 3000].map(time => ({ status: 'done', createdAt: new Date(0), generatedAt: new Date(time) }));
  reports.push({ status: 'failed', createdAt: new Date(0), generatedAt: null });
  const result = summarizeOperations(reports, [{ status: 'success', inputTokens: 20, outputTokens: 30, estimatedCostUSD: 0.01 }, { status: 'failed', inputTokens: null, outputTokens: null, estimatedCostUSD: null }]);
  assert.equal(result.failureRate, 0.25); assert.equal(result.completionTimeMs.p50, 2000); assert.equal(result.completionTimeMs.p95, 3000);
  assert.equal(result.cost.estimatedTotalUSD, null); assert.equal(result.cost.knownEstimateUSD, 0.01); assert.equal(result.unknownUsageCalls, 1);
  assert.equal(summarizeOperations([], []).completionTimeMs.p50, null); assert.equal(summarizeOperations([], []).failureRate, null);
});
