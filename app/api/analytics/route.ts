import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

// Simple in-memory cache for the AI Trend Intelligence to prevent slow loads and high API costs
let trendCache = {
  text: "",
  timestamp: 0
};

export async function GET() {
  try {
    // 1. Leads Overview Aggregations
    // a. Industry Breakdown
    const industryCounts = await prisma.company.groupBy({
      by: ['industry'],
      _count: { industry: true },
      orderBy: { _count: { industry: 'desc' } }
    });

    // b. Persona Performance
    const personaAggregates = await prisma.report.groupBy({
      by: ['personaType'],
      _count: { personaType: true },
      _avg: { score: true }
    });

    const personaPerformance = personaAggregates.map(p => ({
      persona: p.personaType,
      count: p._count.personaType,
      avgScore: Math.round(p._avg.score || 0),
      // Dummy conversion rate (e.g. downloaded PDF) for now until we track downloads
      conversionRate: Math.round((Math.random() * 20 + 30)) + "%" 
    }));

    // c. Signal Heatmap (Count leads per day/hour)
    const leads = await prisma.lead.findMany({
      select: { createdAt: true }
    });
    
    // Day format for Peak Day calculation
    const fullDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayCounts: Record<string, number> = { "Sunday": 0, "Monday": 0, "Tuesday": 0, "Wednesday": 0, "Thursday": 0, "Friday": 0, "Saturday": 0 };
    
    const heatmapData: Record<string, number> = {};
    
    leads.forEach((l) => {
      // 1. Process Date
      const dateStr = l.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD
      heatmapData[dateStr] = (heatmapData[dateStr] || 0) + 1;
      
      // 2. Process Day of week
      const dayName = fullDays[l.createdAt.getDay()];
      dayCounts[dayName]++;
    });
    
    // Find Peak Day
    let peakDay = "N/A";
    let max = 0;
    Object.entries(dayCounts).forEach(([day, count]) => {
      if ((count as number) > max) {
        max = count as number;
        peakDay = day;
      }
    });

    const avgScoreResult = await prisma.report.aggregate({
      _avg: { score: true }
    });
    const avgScore = Math.round(avgScoreResult._avg.score || 0);

    // 2. Trend Intelligence Feed (AI Generated)
    let trendIntelligence = "No trends generated yet.";
    const now = Date.now();
    // Cache for 1 hour (3600000 ms)
    if (trendCache.text && (now - trendCache.timestamp < 3600000)) {
      trendIntelligence = trendCache.text;
    } else {
      try {
        const rawDataForAI = JSON.stringify({
          industryCounts,
          personaPerformance,
          peakSubmissionDay: peakDay,
          averageSystemScore: avgScore
        });

        const { text } = await generateText({
          model: google("models/gemini-2.5-pro"),
          system: "You are a data analyst CRM AI. Review the provided JSON aggregations of CRM lead data and output exactly ONE single sentence summarizing a highly interesting business trend or insight from the data.",
          prompt: `Data: ${rawDataForAI}`,
        });
        
        trendIntelligence = text.replace(/"/g, '').trim();
        trendCache = { text: trendIntelligence, timestamp: now };
      } catch (aiErr) {
        console.error("Trend AI error:", aiErr);
        trendIntelligence = trendCache.text || "Trends temporarily unavailable.";
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          mostCommonIndustry: industryCounts[0]?.industry || "N/A",
          topPersona: personaAggregates.sort((a,b) => b._count.personaType - a._count.personaType)[0]?.personaType || "general",
          peakSubmissionDay: peakDay,
          avgReportScore: avgScore
        },
        industryBreakdown: industryCounts.map(i => ({ name: i.industry || "Unknown", count: i._count.industry })),
        personaPerformance,
        signalHeatmap: heatmapData,
        trendIntelligence
      }
    });

  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
