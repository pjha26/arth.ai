import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEmailEvent } from '../shared/delivery-events.js';

function fixture(target) {
  const report = { id: 'report', leadId: 'lead', deliveryStatus: 'accepted' }, task = { id: 'task', status: 'accepted', report: { leadId: 'lead' } }, lead = { unsubscribed: false };
  const update = (row, field) => async ({ where, data }) => {
    if (!where[field].in.includes(row[field])) return { count: 0 };
    Object.assign(row, data); return { count: 1 };
  };
  const prisma = { report: { findFirst: async () => target === 'report' ? report : null, updateMany: update(report, 'deliveryStatus') },
    followUp: { findFirst: async () => target === 'task' ? task : null, updateMany: update(task, 'status') },
    lead: { update: async ({ data }) => Object.assign(lead, data) } };
  prisma.$transaction = fn => fn(prisma);
  return { prisma, report, task, lead };
}
const event = type => ({ type, data: { email_id: 'provider-id' } });

test('follow-up receipts update their task without changing original report delivery', async () => {
  const f = fixture('task');
  assert.equal(await applyEmailEvent(f.prisma, event('email.bounced')), 'updated');
  assert.equal(f.task.status, 'bounced'); assert.equal(f.report.deliveryStatus, 'accepted');
  await applyEmailEvent(f.prisma, event('email.delivered'));
  assert.equal(f.task.status, 'bounced');
});

test('complaints unsubscribe the correct lead even after an earlier failure receipt', async () => {
  for (const target of ['report', 'task']) {
    const f = fixture(target);
    await applyEmailEvent(f.prisma, event('email.bounced'));
    await applyEmailEvent(f.prisma, event('email.complained'));
    assert.equal(f.lead.unsubscribed, true);
  }
});

test('early unknown receipts ask the provider to retry and unsupported events are ignored', async () => {
  const f = fixture('unknown');
  assert.equal(await applyEmailEvent(f.prisma, event('email.delivered')), 'retry');
  assert.equal(await applyEmailEvent(f.prisma, event('email.opened')), 'ignored');
  assert.equal(await applyEmailEvent(f.prisma, {}), 'ignored');
  assert.equal(await applyEmailEvent(f.prisma, event('__proto__')), 'ignored');
});
