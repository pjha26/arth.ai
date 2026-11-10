import test from 'node:test';
import assert from 'node:assert/strict';
import { deliveryCopy, shouldPollReport } from '../shared/status.js';

test('report processing and email dispatch settle independently without permanent terminal polling', () => {
  assert.equal(shouldPollReport('processing', 'pending'), true);
  assert.equal(shouldPollReport('done', 'sending'), true);
  for (const delivery of ['accepted', 'delivered', 'uncertain', 'skipped', 'bounced', 'failed']) assert.equal(shouldPollReport('done', delivery), false);
  assert.equal(shouldPollReport('failed', 'pending'), false);
  assert.equal(shouldPollReport('unavailable', 'pending'), false);
});

test('only confirmed delivery uses confirmed-delivery wording', () => {
  assert.match(deliveryCopy('accepted'), /not been confirmed/);
  assert.match(deliveryCopy('delivered'), /has been confirmed/);
  assert.match(deliveryCopy('uncertain'), /review/);
  assert.match(deliveryCopy('skipped'), /No email was sent/);
});
