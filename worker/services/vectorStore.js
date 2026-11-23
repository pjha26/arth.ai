import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { embedMany } from 'ai';
import { measureModelCall } from '../../shared/usage.js';
import { budgetedModelFetch } from '../../shared/model-budget.js';
import { prisma } from '../../shared/db.js';
import { reportChunks } from '../../shared/jobs.js';

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY, fetch: budgetedModelFetch('google') });
export async function storeReportIntelligence(lead, report, companyId, reportId, db = prisma) {
  const chunks = reportChunks(lead, report);
  const modelId = process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
  const { embeddings } = await measureModelCall(db, { reportId, operation: 'embedding', provider: 'google', model: modelId }, () => embedMany({
    model: google.textEmbeddingModel(modelId), values: chunks, maxParallelCalls: 1,
    providerOptions: { google: { outputDimensionality: 768 } }, maxRetries: 0, abortSignal: AbortSignal.timeout(10000),
  }));
  if (embeddings.length !== chunks.length || embeddings.some(vector => vector.length !== 768 || !vector.every(Number.isFinite))) {
    throw new Error('Embedding response does not match the report chunks and database dimensions');
  }
  await db.$transaction(async tx => {
    const [current] = await tx.$queryRaw`SELECT id FROM "Report" WHERE id = ${reportId} FOR UPDATE`;
    if (!current) throw new Error('Report was removed before indexing finished');
    await tx.embedding.deleteMany({ where: { reportId } });
    const metadata = JSON.stringify({ model: modelId, dimensions: 768, version: 1 });
    for (const [index, chunk] of chunks.entries()) {
      await tx.$executeRaw`INSERT INTO "Embedding" (id, "companyId", "reportId", chunk, embedding, metadata, "createdAt") VALUES (gen_random_uuid(), ${companyId}, ${reportId}, ${chunk}, ${JSON.stringify(embeddings[index])}::extensions.vector, ${metadata}::jsonb, NOW())`;
    }
  });
}
