import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");

  if (!leadId) {
    return new NextResponse("Missing leadId", { status: 400 });
  }

  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return new NextResponse("Lead not found", { status: 404 });
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: { unsubscribed: true },
    });

    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed</title>
        <style>
          body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f9fafb; margin: 0; }
          .container { background: white; padding: 2rem 3rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align: center; }
          h1 { color: #111827; margin-bottom: 0.5rem; }
          p { color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Unsubscribed</h1>
          <p>You have been successfully unsubscribed from all follow-up emails.</p>
        </div>
      </body>
      </html>
    `, {
      headers: { "Content-Type": "text/html" }
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new NextResponse("An error occurred", { status: 500 });
  }
}
