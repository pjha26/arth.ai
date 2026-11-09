import test from 'node:test';
import assert from 'node:assert/strict';
import { storeIntentScore, markIntentUnavailable } from '../shared/intent.js';
import { reconcileIntentSlack } from '../worker/services/intentSlack.js';

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
  assert.equal(f.events[0].slackStatus, 'pending'); assert.equal(f.events[0].slackScore, 0.9);
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

async function slackFixture(t, send) {
  const f = fixture();
  await storeIntentScore(f.prisma, 'lead', 'report', new Date(), result(0.9));
  const alert = Object.assign(f.events[0], { id: 'event', slackAttempts: 0, report: { company: { name: 'Test <!channel> & Co' } } });
  const matches = where => alert.slackStatus === where.slackStatus
    && (!where.slackDueAt || alert.slackDueAt && alert.slackDueAt <= where.slackDueAt.lte)
    && (where.slackAttempts === undefined || alert.slackAttempts === where.slackAttempts);
  f.prisma.reportEvent.findMany = async ({ where }) => matches(where) ? [{ ...alert }] : [];
  f.prisma.reportEvent.updateMany = async ({ where, data }) => {
    if (!matches(where)) return { count: 0 };
    const { slackAttempts, ...values } = data;
    Object.assign(alert, values);
    if (slackAttempts) alert.slackAttempts += slackAttempts.increment;
    return { count: 1 };
  };
  for (const [key, value] of Object.entries({ NEXT_PUBLIC_APP_URL: 'https://crm.example.invalid', SLACK_WEBHOOK_URL: 'https://slack.example.invalid/hook' })) {
    const old = process.env[key];
    process.env[key] = value;
    t.after(() => { if (old === undefined) delete process.env[key]; else process.env[key] = old; });
  }
  const webhook = t.mock.method(globalThis, 'fetch', send);
  return { ...f, alert, webhook, dispatch: () => reconcileIntentSlack(f.prisma) };
}

test('concurrent workers post a saved crossing once with the original score and staff link', async t => {
  const f = await slackFixture(t, async () => new Response('ok'));
  await markIntentUnavailable(f.prisma, 'lead', new Date(Date.now() + 1000));
  await Promise.all([f.dispatch(), f.dispatch()]);
  await f.dispatch();
  assert.equal(f.webhook.mock.callCount(), 1);
  const [url, request] = f.webhook.mock.calls[0].arguments;
  assert.equal(url, 'https://slack.example.invalid/hook');
  assert.equal(request.method, 'POST');
  assert.equal(JSON.parse(request.body).text, 'Experimental intent signal for Test &lt;!channel&gt; &amp; Co: 90%. Review before outreach: https://crm.example.invalid/dashboard/reports/report');
  assert.equal(f.alert.slackStatus, 'sent');
  assert.equal(f.row.intentStatus, 'unavailable');
});

test('Slack rate limiting schedules a bounded retry without recording another alert', async t => {
  const f = await slackFixture(t, async () => new Response(null, { status: 429, headers: { 'Retry-After': '60' } }));
  await f.dispatch();
  assert.equal(f.alert.slackStatus, 'pending');
  assert.ok(f.alert.slackDueAt.getTime() > Date.now());
  await f.dispatch();
  assert.equal(f.webhook.mock.callCount(), 1);
  for (let i = 0; i < 2; i++) {
    f.alert.slackDueAt = new Date(0);
    await f.dispatch();
  }
  assert.equal(f.alert.slackStatus, 'failed');
  assert.equal(f.webhook.mock.callCount(), 3);
  assert.equal(f.events.length, 1);
  assert.equal(f.row.intentStatus, 'scored');
});

test('failed or unconfirmed deliveries are tracked separately from intent', async t => {
  for (const [name, response, status] of [
    ['missing webhook', null, 'skipped'], ['HTTP rejection', 404, 'failed'], ['server error', 503, 'uncertain'],
    ['lost response', undefined, 'uncertain'], ['interrupted claim', null, 'uncertain'],
  ]) await t.test(name, async test => {
    const f = await slackFixture(test, async () => {
      if (!response) throw new Error('response lost');
      return new Response(null, { status: response });
    });
    if (name === 'missing webhook') delete process.env.SLACK_WEBHOOK_URL;
    if (name === 'interrupted claim') Object.assign(f.alert, { slackStatus: 'sending', slackDueAt: new Date(0), slackAttempts: 1 });
    await f.dispatch();
    await f.dispatch();
    assert.equal(f.alert.slackStatus, status);
    assert.equal(f.webhook.mock.callCount(), response === null ? 0 : 1);
    assert.equal(f.row.intentStatus, 'scored');
  });
});
