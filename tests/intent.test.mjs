import test from 'node:test';
import assert from 'node:assert/strict';
import { storeIntentScore, markIntentUnavailable } from '../shared/intent.js';

function fixture() {
  const row = { id: 'lead', intentProbability: null, intentScoredAt: null, intentAlertedAt: null }, events = [];
  const prisma = { $executeRaw: async () => {}, reportEvent: { create: async ({ data }) => events.push(data) }, lead: {
    findUnique: async () => ({ ...row }), update: async ({ data }) => Object.assign(row, data),
    updateMany: async ({ where, data }) => {
      if (row.intentScoredAt && !(row.intentScoredAt < where.OR[1].intentScoredAt.lt)) return { count: 0 };
      Object.assign(row, data); return { count: 1 };
    },
  } };
  prisma.$transaction = fn => fn(prisma);
  return { row, events, prisma };
}
const result = probability => ({ intent_probability: probability, model_version: 'test-model', experimental: true });

test('newer messages win over late model results and late failure callbacks', async () => {
  const f = fixture(), older = new Date('2026-01-01'), newer = new Date('2026-01-02');
  await storeIntentScore(f.prisma, 'lead', 'report', newer, result(0.2));
  assert.equal(await storeIntentScore(f.prisma, 'lead', 'report', older, result(0.95)), false);
  await markIntentUnavailable(f.prisma, 'lead', older);
  assert.equal(f.row.intentProbability, 0.2); assert.equal(f.events.length, 0);
});

test('meaningful threshold crossings are durably recorded and deduplicated for a day', async () => {
  const f = fixture();
  assert.equal(await storeIntentScore(f.prisma, 'lead', 'report', new Date('2026-01-01'), result(0.9)), true);
  assert.equal(await storeIntentScore(f.prisma, 'lead', 'report', new Date('2026-01-02'), result(0.1)), false);
  assert.equal(await storeIntentScore(f.prisma, 'lead', 'report', new Date('2026-01-03'), result(0.9)), false);
  assert.equal(f.events.length, 1); assert.equal(f.events[0].actor, 'lead');
  assert.equal(f.row.intentStatus, 'scored'); assert.equal(f.row.intentModel, 'test-model');
});

test('an unavailable scorer clears the current estimate without erasing alert deduplication', async () => {
  const f = fixture();
  await storeIntentScore(f.prisma, 'lead', 'report', new Date('2026-01-01'), result(0.9));
  await markIntentUnavailable(f.prisma, 'lead', new Date('2026-01-02'));
  assert.equal(f.row.intentProbability, null); assert.equal(f.row.intentStatus, 'unavailable');
  assert.equal(f.row.intentModel, null); assert.ok(f.row.intentAlertedAt);
});

test('invalid probability or missing model version cannot create a score', async () => {
  const f = fixture();
  for (const invalid of [result(NaN), result(2), { intent_probability: 0.9 }]) await assert.rejects(storeIntentScore(f.prisma, 'lead', 'report', new Date(), invalid), /Invalid scoring/);
  assert.equal(f.row.intentProbability, null); assert.equal(f.events.length, 0);
});
