import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed, streamText } from "ai";
import { prisma } from "@/lib/prisma";
import { sendSlackNotification } from "@/lib/slack";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function GET(request: Request, context: any) {
  const { id } = await context.params;

  try {
    const messages = await prisma.chatMessage.findMany({
      where: { reportId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true },
    });

    return Response.json(messages);
  } catch (error) {
    console.error("[Chat GET] Error fetching chat history:", error);
    return Response.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}

// Helper: extract plain text from a UIMessage (which uses parts[]) or a CoreMessage (which uses content)
function extractText(msg: any): string {
  if (typeof msg.content === "string" && msg.content.length > 0) return msg.content;
  if (typeof msg.text === "string" && msg.text.length > 0) return msg.text;
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join("");
  }
  return "";
}

export async function POST(request: Request, context: any) {
  const { id: reportId } = await context.params;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── 1. Extract the user's latest text ──────────────────────────
  let userText = "";
  if (body.messages && body.messages.length > 0) {
    const lastMsg = body.messages[body.messages.length - 1];
    userText = extractText(lastMsg);
  }
  if (!userText && typeof body.text === "string") {
    userText = body.text;
  }

  if (!userText) {
    console.error("[Chat POST] Could not extract user text from body:", JSON.stringify(body).slice(0, 500));
    return Response.json({ error: "No message text found" }, { status: 400 });
  }

  console.log(`[Chat POST] reportId=${reportId} userText="${userText.slice(0, 80)}"`);

  // ── 2. Fire-and-forget: save user message + update intent score ─
  prisma.chatMessage
    .create({ data: { reportId, role: "user", content: userText } })
    .catch((e) => console.error("Failed to save user msg:", e));

  // Intent scoring
  (async () => {
    let scoreBump = 2;
    const lower = userText.toLowerCase();
    if (userText.length > 50) scoreBump += 3;
    const hotWords = ["pricing", "cost", "integrate", "competitor", "buy", "sales", "purchase", "vs"];
    if (hotWords.some((w) => lower.includes(w))) scoreBump += 10;
    
    try {
      const report = await prisma.report.findUnique({ 
        where: { id: reportId }, 
        select: { score: true, company: { select: { name: true } } } 
      });
      if (report) {
        const newScore = (report.score || 0) + scoreBump;
        await prisma.report.update({ where: { id: reportId }, data: { score: newScore } });

        if (scoreBump >= 10) {
          await sendSlackNotification(`🚀 *${report.company?.name || 'A company'}* just asked a high-intent question!\n*Question:* "${userText}"\n*Intent Score Spike:* +${scoreBump} (Total: ${newScore})\nView Dashboard: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/reports/${reportId}`);
        }
      }
    } catch (e) {
      console.error("Failed to update intent score:", e);
    }
  })();

  // ── 3. RAG context (best-effort – failures are not fatal) ──────
  let contextStr = "No specific report context found.";
  try {
    const { embedding } = await embed({
      model: google.textEmbeddingModel("text-embedding-004"),
      value: userText,
    });
    const embeddingStr = `[${embedding.join(",")}]`;

    const relevantChunks: any[] = await prisma.$queryRaw`
      SELECT chunk as content, 1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM "Embedding"
      WHERE "reportId" = ${reportId}
      ORDER BY similarity DESC
      LIMIT 3
    `;

    if (relevantChunks?.length > 0) {
      contextStr = relevantChunks.map((c) => c.content).join("\n\n---\n\n");
    }
  } catch (ragError) {
    console.warn("[Chat POST] RAG/embed failed (continuing without context):", ragError);
  }

  // ── 4. Company info & Base Context ──────────────────────────────
  let companyName = "the company";
  let baseInsights = "";
  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { 
        personaType: true, 
        insights: true,
        deltaInsights: true,
        company: { select: { name: true } } 
      },
    });
    companyName = report?.company?.name || companyName;
    if (report) {
      baseInsights = `\n<base_insights>\n${JSON.stringify(report.insights || {}, null, 2)}\n</base_insights>`;
      if (report.deltaInsights) {
        baseInsights += `\n<delta_signals>\n${JSON.stringify(report.deltaInsights, null, 2)}\n</delta_signals>`;
      }
    }
  } catch (e) {
    console.warn("[Chat POST] Failed to fetch report info:", e);
  }

  const systemPrompt = `
You are an intelligence analyst for ArthAI.
You have analyzed ${companyName}'s report.
Answer based ONLY on the report data provided.
Be specific, actionable, and concise.
Never hallucinate facts not in the report.

${baseInsights}

<rag_context>
${contextStr}
</rag_context>
  `.trim();

  // ── 5. Convert UIMessages → CoreMessages for streamText ────────
  const coreMessages = (body.messages || [])
    .map((msg: any) => {
      const role = msg.role === "user" || msg.role === "assistant" || msg.role === "system" ? msg.role : "user";
      const content = extractText(msg);
      return content ? { role, content } : null;
    })
    .filter(Boolean);

  if (coreMessages.length === 0) {
    coreMessages.push({ role: "user", content: userText });
  }

  // ── 6. Stream the AI response ──────────────────────────────────
  const ALLOWED_MODELS = ["gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash"];
  const requestedModel = body.model || "gemini-2.0-flash";
  const selectedModel = ALLOWED_MODELS.includes(requestedModel) ? requestedModel : "gemini-2.0-flash";

  // Map to the actual model names available in the Google v1beta API
  const modelMap: Record<string, string> = {
    "gemini-1.5-flash": "gemini-flash-latest",
    "gemini-2.0-flash": "gemini-2.0-flash",
    "gemini-2.5-flash": "gemini-2.5-flash",
  };
  const modelId = modelMap[selectedModel] || "gemini-2.0-flash";
  console.log(`[Chat POST] Using model: ${modelId} (requested: ${selectedModel})`);

  try {
    const result = await streamText({
      model: google(modelId),
      system: systemPrompt,
      messages: coreMessages.slice(-4),
      onFinish: async ({ text }) => {
        try {
          await prisma.chatMessage.create({
            data: { reportId, role: "assistant", content: text },
          });
        } catch (e) {
          console.error("Failed to save assistant msg:", e);
        }
      },
    });

    return result.toDataStreamResponse();
  } catch (streamError) {
    console.error("[Chat POST] streamText failed:", streamError);
    return Response.json({ error: "AI generation failed" }, { status: 500 });
  }
}
