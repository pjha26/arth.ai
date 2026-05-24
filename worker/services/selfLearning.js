import pkg from "@prisma/client/index.js";
const { PrismaClient } = pkg;
const prisma = new PrismaClient();

export async function learnFromReport(reportInsights, companyId, leadInput) {
  try {
    console.log(`[Self-Learning 🧠] Extracting intelligence for company ${companyId}...`);

    // 1. Extract and store Signals
    if (reportInsights.signals && reportInsights.signals.length > 0) {
      const signalData = reportInsights.signals.map(s => ({
        companyId,
        type: s.type,
        data: s.data,
        severity: s.severity
      }));
      await prisma.signal.createMany({
        data: signalData
      });
      console.log(`[Self-Learning 🧠] Stored ${signalData.length} signals.`);
    }

    // 2. Update Company Profile (Tech Stack, Funding, Audit Count)
    await prisma.company.update({
      where: { id: companyId },
      data: {
        techStack: reportInsights.techStack || null,
        fundingStage: reportInsights.fundingStage || null,
        lastAuditedAt: new Date(),
        auditCount: { increment: 1 }
      }
    });
    console.log(`[Self-Learning 🧠] Updated company profile.`);

    // 3. Update Industry Benchmarks
    const industry = leadInput.industry;
    if (industry && reportInsights.auditScores) {
      const techCount = reportInsights.techStack ? reportInsights.techStack.length : 0;
      
      const metrics = [
        { name: "digitalReadiness", value: reportInsights.auditScores.digitalReadiness },
        { name: "automationPotential", value: reportInsights.auditScores.automationPotential },
        { name: "growthIndex", value: reportInsights.auditScores.growthIndex },
        { name: "avg_tech_stack_size", value: techCount }
      ];

      for (const m of metrics) {
        const benchmark = await prisma.industryBenchmark.findFirst({
          where: { industry, metric: m.name }
        });

        if (benchmark) {
          const newSize = benchmark.sampleSize + 1;
          const newValue = ((benchmark.value * benchmark.sampleSize) + m.value) / newSize;
          await prisma.industryBenchmark.update({
            where: { id: benchmark.id },
            data: { value: newValue, sampleSize: newSize }
          });
        } else {
          await prisma.industryBenchmark.create({
            data: {
              industry,
              metric: m.name,
              value: m.value,
              sampleSize: 1
            }
          });
        }
      }
      console.log(`[Self-Learning 🧠] Updated industry benchmarks for ${industry}.`);
    }
  } catch (error) {
    console.error(`[Self-Learning 🧠] Failed to process intelligence:`, error.message);
  }
}

export async function getIndustryBenchmarks(industry) {
  try {
    const benchmarks = await prisma.industryBenchmark.findMany({
      where: { industry }
    });
    
    if (benchmarks.length === 0) return null;
    
    const formatted = {};
    benchmarks.forEach(b => {
      formatted[b.metric] = {
        value: Number(b.value.toFixed(1)),
        sampleSize: b.sampleSize
      };
    });
    return formatted;
  } catch (error) {
    console.error(`[Self-Learning 🧠] Error fetching industry benchmarks:`, error.message);
    return null;
  }
}
