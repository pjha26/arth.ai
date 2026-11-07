import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { embed } from 'ai';
import { prisma } from '../../shared/db.js';
import { reportChunks } from '../../shared/jobs.js';

const google = createGoogleGenerativeAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY });
export async function storeReportIntelligence(lead, report, companyId, reportId) {
  const rows = [];
  const modelId = process.env.EMBEDDING_MODEL || 'gemini-embedding-001';
  for (const chunk of reportChunks(lead, report)) {
    const { embedding } = await embed({ model: google.textEmbeddingModel(modelId), value: chunk,
      providerOptions: { google: { outputDimensionality: 768 } }, maxRetries: 0, abortSignal: AbortSignal.timeout(10000) });
    if (embedding.length !== 768) throw new Error('Embedding dimensions do not match the database');
    rows.push({ chunk, embedding: JSON.stringify(embedding) });
  }
  await prisma.$transaction(async tx => {
    await tx.embedding.deleteMany({ where: { reportId } });
    const metadata = JSON.stringify({ model: modelId, dimensions: 768, version: 1 });
    for (const row of rows) await tx.$executeRaw`INSERT INTO "Embedding" (id, "companyId", "reportId", chunk, embedding, metadata, "createdAt") VALUES (gen_random_uuid(), ${companyId}, ${reportId}, ${row.chunk}, ${row.embedding}::vector, ${metadata}::jsonb, NOW())`;
  });
}
