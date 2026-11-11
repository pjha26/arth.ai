import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { assertStaging } from './fixtures/staging-safety.mjs';

assertStaging();
const database = `arthai_migrationcheck_${Date.now()}`;
const admin = new PrismaClient();
const url = new URL(process.env.DATABASE_URL); url.pathname = `/${database}`;
const env = { ...process.env, DATABASE_URL: url.href, DIRECT_URL: url.href };
assertStaging(env);
const legacy = new PrismaClient({ datasources: { db: { url: url.href } } });
let created = false;
function prisma(...args) {
  const result = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', ...args], { env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Isolated migration command failed: ${result.stderr || result.stdout}`);
}
try {
  await admin.$executeRawUnsafe(`CREATE DATABASE "${database}"`);
  created = true;
  prisma('db', 'execute', '--file', 'prisma/migrations/20261104000000_baseline/migration.sql', '--schema', 'prisma/schema.prisma');
  const companyId = randomUUID(), leadId = randomUUID(), reportId = randomUUID(), chatId = randomUUID();
  await legacy.$executeRaw`INSERT INTO "Company" (id,domain,name,"updatedAt") VALUES (${companyId},'migration-fixture.invalid','Migration fixture',NOW())`;
  await legacy.$executeRaw`INSERT INTO "Lead" (id,"companyId","fullName",email,"painPoints","intentProbability") VALUES (${leadId},${companyId},'Migration fixture','migration@example.invalid','Retain this context',0.9)`;
  await legacy.$executeRaw`INSERT INTO "Report" (id,"companyId","personaType",score,status,"pdfUrl","updatedAt") VALUES (${reportId},${companyId},'Founder',42,'done','legacy-reference',NOW())`;
  await legacy.$executeRaw`INSERT INTO "ChatMessage" (id,"reportId",role,content) VALUES (${chatId},${reportId},'user','Keep this historical conversation')`;
  prisma('migrate', 'resolve', '--applied', '20261104000000_baseline');
  prisma('migrate', 'deploy');
  const unprotected = await legacy.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' AND NOT rowsecurity`;
  assert.deepEqual(unprotected, [], 'Every application table must have row-level security');
  const report = await legacy.report.findUniqueOrThrow({ where: { id: reportId } });
  const lead = await legacy.lead.findUniqueOrThrow({ where: { id: leadId } });
  const chat = await legacy.chatMessage.findUniqueOrThrow({ where: { id: chatId } });
  assert.equal(report.legacyScore, 42); assert.equal(report.score, null); assert.equal(report.leadId, null);
  assert.equal(report.personaType, 'founder'); assert.equal(report.pdfUrl, 'legacy-reference');
  assert.equal(report.deliveryStatus, 'legacy'); assert.equal(report.verificationStatus, 'unverified');
  assert.equal(lead.legacyIntentProbability, 0.9); assert.equal(lead.intentProbability, null);
  assert.equal(lead.outreachConsent, false); assert.equal(lead.painPoints, 'Retain this context');
  assert.equal(chat.content, 'Keep this historical conversation'); assert.equal(chat.actor, 'legacy');
  assert.equal(await legacy.followUp.count(), 0);
  const fresh = await legacy.report.create({ data: { companyId, leadId, personaType: 'general' } });
  const task = { reportId: fresh.id, stage: 1, dueAt: new Date() };
  await legacy.followUp.create({ data: task });
  await assert.rejects(legacy.followUp.create({ data: task }), error => error.code === 'P2002');
  await assert.rejects(legacy.followUp.create({ data: { ...task, stage: 4 } }));
  await legacy.report.delete({ where: { id: fresh.id } });
  assert.equal(await legacy.followUp.count({ where: { reportId: fresh.id } }), 0);
  const result = { passed: true, checkedAt: new Date().toISOString(), target: 'isolated local Docker database', scoresArchived: true, contactsPreserved: true, legacyChatPreserved: true, noGuessedLeadAssociation: true, noAutomaticLegacyDelivery: true };
  await mkdir('.data/staging', { recursive: true }); await writeFile('.data/staging/migration-check.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await legacy.$disconnect();
  // This exact temporary database was created above, under a validated localhost-only connection.
  if (created) await admin.$executeRawUnsafe(`DROP DATABASE "${database}"`);
  await admin.$disconnect();
}
