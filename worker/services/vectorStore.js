import { google } from "@ai-sdk/google";
import { embed } from "ai";
import pkg from "@prisma/client/index.js";
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

// Configure the embedding model
const embeddingModel = google.textEmbeddingModel('text-embedding-004');

export async function storeReportIntelligence(lead, report, companyId, reportId) {
  try {
    console.log(`[VectorStore] Embedding intelligence for ${lead.companyName}...`);
    
    // Create a rich text chunk representing the core insights
    const chunkContent = `
Company: ${lead.companyName}
Industry: ${lead.industry}
Pain Points: ${lead.painPoints}
Executive Summary: ${report.executiveSummary}
AI Opportunities Suggested: ${report.aiOpportunities.map(o => o.title).join(", ")}
    `.trim();

    // Generate embedding
    const { embedding } = await embed({
      model: embeddingModel,
      value: chunkContent,
    });

    // We use Prisma raw query for pgvector insertions
    const embeddingStr = `[${embedding.join(',')}]`;

    await prisma.$executeRaw`
      INSERT INTO "Embedding" (id, "companyId", "reportId", chunk, embedding, "createdAt")
      VALUES (gen_random_uuid(), ${companyId}, ${reportId}, ${chunkContent}, ${embeddingStr}::vector, NOW())
    `;

    console.log(`[VectorStore] Successfully stored vectorized intelligence for ${lead.companyName}.`);
  } catch (error) {
    console.error(`[VectorStore] Error storing intelligence:`, error);
  }
}

export async function searchPastReports(query) {
  try {
    console.log(`[VectorStore] Semantic search: "${query}"...`);
    
    // Embed the query
    const { embedding } = await embed({
      model: embeddingModel,
      value: query,
    });
    
    const embeddingStr = `[${embedding.join(',')}]`;

    // Retrieve top 3 similar past reports
    // Uses cosine similarity (<=>)
    const results = await prisma.$queryRaw`
      SELECT c.name as "companyName", c.industry, e.chunk as content, 
             1 - (e.embedding <=> ${embeddingStr}::vector) as similarity
      FROM "Embedding" e
      JOIN "Company" c ON c.id = e."companyId"
      ORDER BY e.embedding <=> ${embeddingStr}::vector
      LIMIT 3
    `;

    if (!results || results.length === 0) return "No relevant historical intelligence found.";

    let formattedResult = "Historical Intelligence (from past similar companies):\n\n";
    results.forEach((r, idx) => {
      // Return highly relevant matches
      if (r.similarity > 0.5) {
        formattedResult += `[Past Case Study ${idx + 1}] Company: ${r.companyName} (${r.industry})\nInsight: ${r.content}\n\n`;
      }
    });

    return formattedResult.trim() === "Historical Intelligence (from past similar companies):" 
           ? "No highly relevant historical intelligence found." 
           : formattedResult;

  } catch (error) {
    console.error(`[VectorStore] Error during semantic search:`, error);
    return "Vector search failed or is unavailable.";
  }
}

export async function getSimilarCompanies(lead) {
  try {
    const query = `${lead.industry} ${lead.painPoints}`;
    const { embedding } = await embed({
      model: embeddingModel,
      value: query,
    });
    const embeddingStr = `[${embedding.join(',')}]`;

    const results = await prisma.$queryRaw`
      SELECT c.name as "companyName", c.industry, e.chunk as content, 
             1 - (e.embedding <=> ${embeddingStr}::vector) as similarity
      FROM "Embedding" e
      JOIN "Company" c ON c.id = e."companyId"
      WHERE 1 - (e.embedding <=> ${embeddingStr}::vector) > 0.5
      ORDER BY similarity DESC
      LIMIT 5
    `;
    
    return results;
  } catch (error) {
    console.error(`[VectorStore] Error fetching similar companies:`, error);
    return [];
  }
}

export async function getCompanyHistory(companyId) {
  try {
    console.log(`[VectorStore] Checking exact history for companyId: ${companyId}...`);
    const results = await prisma.embedding.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    if (results.length > 0) {
      return results[0].chunk;
    }
    return null;
  } catch (error) {
    console.error(`[VectorStore] Error fetching company history:`, error);
    return null;
  }
}
