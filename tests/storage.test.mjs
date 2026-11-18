import test from 'node:test';
import assert from 'node:assert/strict';
import { saveReportPdf, readReportPdf } from '../shared/storage.js';

const id = '00000000-0000-4000-8000-000000000001';

function storageFixture(t, isPublic = false) {
  const env = { REPORT_STORAGE: 'supabase', SUPABASE_URL: 'https://project.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-private-key', SUPABASE_REPORTS_BUCKET: 'arthai-reports' };
  const previous = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });
  const objects = new Map();
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers.apikey, env.SUPABASE_SERVICE_ROLE_KEY);
    if (url.endsWith('/bucket/arthai-reports')) return Response.json({ id: 'arthai-reports', public: isPublic });
    if (options.method === 'POST') {
      assert.equal(options.headers['x-upsert'], 'true');
      objects.set(url.split('/').at(-1), Buffer.from(options.body));
      return Response.json({ Key: 'stored' });
    }
    const bytes = objects.get(url.split('/').at(-1));
    return new Response(bytes || null, { status: bytes ? 200 : 404 });
  });
  return { objects, requests };
}

test('Supabase retries use one object and authorized reads preserve the PDF bytes', async t => {
  const { objects, requests } = storageFixture(t);
  const pdf = Buffer.from('%PDF-1.7 private fixture');
  const reference = await saveReportPdf(id, pdf);
  assert.equal(reference, `supabase:arthai-reports/${id}.pdf`);
  assert.equal(await saveReportPdf(id, pdf), reference);
  assert.equal(objects.size, 1);
  assert.deepEqual(await readReportPdf(reference), pdf);
  assert.ok(requests.at(-1).url.includes('/object/authenticated/'));
});

test('public buckets block upload and download before object access', async t => {
  const { requests } = storageFixture(t, true);
  await assert.rejects(saveReportPdf(id, Buffer.from('pdf')), /must be private/);
  await assert.rejects(readReportPdf(`supabase:arthai-reports/${id}.pdf`), /must be private/);
  assert.equal(requests.length, 2);
  assert.ok(requests.every(request => request.url.includes('/bucket/')));
});

test('storage rejects paths, credentials in URLs, and provider errors without exposing keys', async t => {
  const { requests } = storageFixture(t);
  await assert.rejects(readReportPdf('supabase:arthai-reports/../../.env'), /Invalid PDF/);
  assert.equal(requests.length, 0);
  process.env.SUPABASE_URL = 'https://user:password@project.supabase.co';
  await assert.rejects(saveReportPdf(id, Buffer.from('pdf')), /not configured/);
  process.env.SUPABASE_URL = 'https://project.supabase.co';
  globalThis.fetch.mock.mockImplementation(async () => new Response('test-private-key', { status: 403 }));
  await assert.rejects(saveReportPdf(id, Buffer.from('pdf')), error => {
    assert.equal(error.message, 'Private storage request failed (HTTP 403)');
    return true;
  });
});
