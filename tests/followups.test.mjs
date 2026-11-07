import test from 'node:test';
import assert from 'node:assert/strict';
import { processFollowUp, reconcileFollowUps } from '../worker/services/followupWorker.js';

function fixture() {
  const task = { id: 'task-1', reportId: 'report-1', stage: 1, status: 'pending', dueAt: new Date(Date.now() - 1000),
    report: { id: 'report-1', status: 'done', deliveryStatus: 'accepted', lead: { id: 'lead-1', email: 'qa@example.invalid', outreachConsent: true, unsubscribed: false, followUpStage: 3 } } };
  let sends = 0;
  const queued = [];
  const matches = where => Object.entries(where).every(([key, value]) => {
    if (value && typeof value === 'object') {
      return task[key] && (value.lt === undefined || task[key] < value.lt) && (value.lte === undefined || task[key] <= value.lte);
    }
    return task[key] === value;
  });
  const services = {
    prisma: { followUp: {
      findUnique: async () => ({ ...task }),
      findMany: async ({ where }) => matches(where) ? [{ ...task }] : [],
      updateMany: async ({ where, data }) => { if (!matches(where)) return { count: 0 }; Object.assign(task, data); return { count: 1 }; },
      update: async ({ data }) => Object.assign(task, data),
    } },
    sendFollowUpEmail: async (report, stage) => { assert.equal(report.id, task.reportId); assert.equal(stage, task.stage); sends++; return { id: 'provider-1' }; },
    followupsQueue: { add: async (...args) => queued.push(args) },
  };
  return { task, services, queued, sends: () => sends, job: { data: { taskId: task.id } } };
}

test('queue outage preserves database tasks and next reconciliation restores them', async () => {
  const f = fixture(), add = f.services.followupsQueue.add;
  f.services.followupsQueue.add = async () => { throw new Error('Redis unavailable'); };
  await assert.rejects(reconcileFollowUps(f.services), /Redis unavailable/);
  assert.equal(f.task.status, 'pending'); assert.equal(f.sends(), 0);
  f.services.followupsQueue.add = add;
  await reconcileFollowUps(f.services);
  assert.deepEqual(f.queued[0], ['followup', { taskId: 'task-1' }, { jobId: 'followup-task-1', removeOnComplete: true, removeOnFail: true }]);
  await processFollowUp(f.job, f.services);
  assert.equal(f.task.status, 'accepted'); assert.equal(f.task.providerMessageId, 'provider-1');
  assert.equal(f.sends(), 1);
  await reconcileFollowUps(f.services);
  assert.equal(f.queued.length, 1);
});

test('concurrent and replayed jobs claim a task once without using a different report stage', async () => {
  const f = fixture();
  await Promise.all([processFollowUp(f.job, f.services), processFollowUp(f.job, f.services)]);
  await processFollowUp(f.job, f.services);
  assert.equal(f.sends(), 1); assert.equal(f.task.status, 'accepted');
});

test('consent, unsubscribe, missing recipients, and unsuccessful initial delivery prevent sending', async () => {
  const changes = [
    f => { f.task.report.lead.outreachConsent = false; },
    f => { f.task.report.lead.unsubscribed = true; },
    f => { f.task.report.lead.email = null; },
    f => { f.task.report.lead = null; },
    f => { f.task.report.deliveryStatus = 'bounced'; },
    f => { f.task.report.status = 'failed'; },
  ];
  for (const change of changes) {
    const f = fixture(); change(f);
    await processFollowUp(f.job, f.services);
    assert.equal(f.task.status, 'skipped'); assert.equal(f.sends(), 0);
  }
});

test('future tasks wait and messages overdue by more than a day expire', async () => {
  const f = fixture(); f.task.dueAt = new Date(Date.now() + 86400000);
  await reconcileFollowUps(f.services); await processFollowUp(f.job, f.services);
  assert.equal(f.queued.length, 0); assert.equal(f.task.status, 'pending'); assert.equal(f.sends(), 0);
  f.task.dueAt = new Date(Date.now() - 2 * 86400000);
  await processFollowUp(f.job, f.services);
  assert.equal(f.task.status, 'skipped'); assert.match(f.task.errorMessage, /expired/); assert.equal(f.sends(), 0);
});

test('ambiguous provider responses are recorded without automatic resend', async () => {
  const f = fixture(); let attempts = 0;
  f.services.sendFollowUpEmail = async () => { attempts++; throw new Error('Response lost'); };
  await processFollowUp(f.job, f.services);
  await processFollowUp(f.job, f.services); await reconcileFollowUps(f.services);
  assert.equal(f.task.status, 'uncertain'); assert.equal(attempts, 1); assert.equal(f.queued.length, 0);
});

test('crash after dispatch claim becomes uncertain while a recent claim stays in progress', async () => {
  const f = fixture(); f.task.status = 'sending'; f.task.startedAt = new Date();
  await reconcileFollowUps(f.services); assert.equal(f.task.status, 'sending');
  f.task.startedAt = new Date(Date.now() - 11 * 60000);
  await reconcileFollowUps(f.services);
  assert.equal(f.task.status, 'uncertain'); assert.equal(f.queued.length, 0); assert.equal(f.sends(), 0);
});

test('failed acceptance write cannot cause another provider send', async () => {
  const f = fixture();
  f.services.prisma.followUp.update = async () => { throw new Error('Database write failed'); };
  await processFollowUp(f.job, f.services); await processFollowUp(f.job, f.services);
  assert.equal(f.task.status, 'uncertain'); assert.equal(f.sends(), 1);
});

test('legacy untracked jobs do not send emails', async () => {
  const f = fixture();
  await processFollowUp({ data: { reportId: 'report-1', leadId: 'lead-1', stage: 1 } }, f.services);
  assert.equal(f.sends(), 0); assert.equal(f.task.status, 'pending');
});
