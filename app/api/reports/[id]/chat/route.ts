import { NextResponse } from "next/server";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed, streamText } from "ai";
import { prisma } from "@/lib/prisma";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function GET(request: Request, context: any) {
  // Access params after awaiting if Next.js 15, but for Next 14 standard destructure is fine.
  // Using context.params is safe.
  const { id } = await context.params;

  try {
    const messages = await prisma.chatMessage.findMany({
      where: { reportId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("[Chat GET] Error fetching chat history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

export async function POST(request: Request, context: any) {
  const { id: reportId } = await context.params;
  
  try {
    const { messages } = await request.json();
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage || lastMessage.role !== "user") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Save the user's message asynchronously to not block response
    prisma.chatMessage.create({
      data: {
        reportId,
        role: "user",
        content: lastMessage.content
      }
    }).catch(e => console.error("Failed to save user msg:", e));

    // 1. Embed the user query
    const { embedding } = await embed({
      model: google.textEmbeddingModel('text-embedding-004'),
      value: lastMessage.content,
    });
    const embeddingStr = `[${embedding.join(',')}]`;

    // 2. Perform semantic search for this specific report using pgvector
    const relevantChunks = await prisma.$queryRaw`
      SELECT chunk as content, 1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM "Embedding"
      WHERE "reportId" = ${reportId}
      ORDER BY similarity DESC
      LIMIT 3
    `;

    // 3. Format the context
    let contextStr = "No specific report context found.";
    // @ts-ignore
    if (relevantChunks && relevantChunks.length > 0) {
      // @ts-ignore
      contextStr = relevantChunks.map(c => c.content).join("\n\n---\n\n");
    }

    // 4. Determine Persona from Report for tailored responses
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { personaType: true, company: { select: { name: true } } }
    });

    const persona = report?.personaType || "general";
    const companyName = report?.company?.name || "the company";

    const systemPrompt = `
You are an expert B2B business analyst and AI consultant answering questions about an AI intelligence report for ${companyName}.
The user has the persona: ${persona.toUpperCase()}. Tailor your response to this persona (e.g., if Founder, focus on growth/market; if CTO, focus on tech/architecture; if Marketer, focus on positioning).

Use the following highly relevant chunks extracted from the AI report to answer the user's query:

<report_context>
${contextStr}
</report_context>

Rules:
1. Answer directly and concisely.
2. If the answer is not in the context, use your general knowledge but state that it's an external observation.
3. Keep formatting clean (markdown lists/bolding is good).
4. Do NOT make up numbers or claims about the company not present in the context.
    `.trim();

    // 5. Stream the response using gemini-1.5-flash (or pro)
    const result = await streamText({
      model: google("gemini-1.5-flash"),
      system: systemPrompt,
      messages: messages.slice(-4), // keep last 3 + the new one for flow
      onFinish: async ({ text }) => {
        // Save the assistant's response to the database once the stream completes
        try {
          await prisma.chatMessage.create({
            data: {
              reportId,
              role: "assistant",
              content: text
            }
          });
        } catch (e) {
          console.error("Failed to save assistant msg:", e);
        }
      }
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("[Chat POST] Error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
