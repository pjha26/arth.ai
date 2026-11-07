import { reportJobSchema } from '../../shared/jobs.js';
import { readinessScore } from '../../shared/report.js';

export async function processReport(job, services) {
  const { prisma, enrich, generateAiReport, generatePDF, saveReportPdf, storeReportIntelligence } = services;
  const data = reportJobSchema.parse(job.data);
  const { reportId, leadInput: lead } = data;
  if (data.leadId !== lead.id) throw new Error("Job lead identity mismatch");
  let row = await prisma.report.findUnique({ where: { id: reportId } });
  if (!row || row.status === 'done' || job.id !== `${reportId}-${row.generationAttempt}`) return;
  if (row.leadId !== data.leadId || row.companyId !== data.companyId) throw new Error('Queued job does not match the stored report owner');
  await prisma.report.update({ where: { id: reportId }, data: { status: 'processing', errorMessage: null } });
  async function stage(name, task) {
    const entry = await prisma.pipelineStage.create({ data: { reportId, stage: name, status: 'running' } });
    try {
      const result = await task();
      await prisma.pipelineStage.update({ where: { id: entry.id }, data: { status: 'done' } });
      return result;
    } catch (error) {
      await prisma.pipelineStage.update({ where: { id: entry.id }, data: { status: 'failed', message: error.message.slice(0, 500) } });
      throw error;
    }
  }
  try {
    let insights = row.insights;
    let enriched;
    if (!insights || row.verificationStatus !== 'reviewed') {
      enriched = await stage('enrich', () => enrich(lead, data.companyId, row.freshResearch));
      insights = await stage('ai_report', () => generateAiReport(lead, enriched, reportId, data.companyId));
      // Sources and the reviewed report form a single recoverable checkpoint.
      await prisma.$transaction(async tx => {
        await tx.reportSource.deleteMany({ where: { reportId } });
        await tx.reportSource.createMany({ data: enriched.sources.map(s => ({ ...s, id: `${reportId}-${s.id}`, reportId, retrievedAt: new Date(s.retrievedAt), publishedAt: s.publishedAt ? new Date(s.publishedAt) : null })) });
        await tx.report.update({ where: { id: reportId }, data: { insights, aiSummary: insights.executiveSummary, verificationStatus: 'reviewed', score: readinessScore(insights) } });
      });
    }
    if (row.artifactStatus !== 'ready' || !row.pdfUrl) {
      const reference = await stage('pdf', async () => {
        const pdf = await generatePDF(lead, enriched || { logo: null }, insights);
        return saveReportPdf(reportId, pdf);
      });
      row = await prisma.report.update({ where: { id: reportId }, data: { pdfUrl: reference, artifactStatus: 'ready' } });
    }
    await storeReportIntelligence(lead, insights, data.companyId, reportId).catch(error => console.warn('Embedding unavailable; full report context retained:', error.message));
    await prisma.report.update({ where: { id: reportId }, data: { status: 'done', generatedAt: row.generatedAt || new Date(), chatEnabled: true } });
  } catch (error) {
    const finalAttempt = job.attemptsMade + 1 >= (job.opts.attempts || 1);
    await prisma.report.update({ where: { id: reportId }, data: { status: finalAttempt ? 'failed' : 'pending', dispatchedAt: finalAttempt ? row.dispatchedAt : new Date(), errorMessage: error.message.slice(0, 500) } });
    throw error;
  }
}
