export function summarizeAnalytics(leads, reports, events, now = new Date()) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const reportLead = new Map(reports.map(r => [r.id, r.leadId]));
  const downloaded = new Set(events.filter(e => e.type === 'download' && e.actor === reportLead.get(e.reportId)).map(e => e.actor));
  const industries = new Map(), personas = new Map(), heatmap = {}, dayCounts = {};
  const scoresByLead = new Map();
  for (const report of reports) { if (report.score != null) { const values = scoresByLead.get(report.leadId) || []; values.push(report.score); scoresByLead.set(report.leadId, values); } }
  for (const lead of leads) {
    const industry = lead.company.industry || 'Unknown';
    industries.set(industry, (industries.get(industry) || 0) + 1);
    const key = lead.personaType.toLowerCase();
    const group = personas.get(key) || { count: 0, converted: 0, scores: [] };
    group.count++; if (downloaded.has(lead.id)) group.converted++;
    group.scores.push(...(scoresByLead.get(lead.id) || []));
    personas.set(key, group);
    const date = new Date(lead.createdAt), day = dayNames[date.getUTCDay()];
    heatmap[`${day}-${date.getUTCHours()}`] = (heatmap[`${day}-${date.getUTCHours()}`] || 0) + 1;
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  }
  const avg = values => values.length ? Math.round(values.reduce((a,b) => a+b, 0) / values.length) : null;
  const industryBreakdown = [...industries].map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count);
  const personaPerformance = [...personas].map(([persona, g]) => ({ persona, count: g.count, avgScore: avg(g.scores), conversionRate: `${Math.round(g.converted / g.count * 100)}%`, salesConversionRate: `${Math.round(leads.filter(l => l.personaType.toLowerCase() === persona && l.salesStatus === "converted").length / g.count * 100)}%` }));
  const dates = Array.from({ length: 14 }, (_, i) => new Date(now.getTime() - (13-i)*86400000).toISOString().slice(0,10));
  const spark = predicate => dates.map(date => reports.filter(r => new Date(r.createdAt).toISOString().slice(0,10) === date && predicate(r)).length);
  return {
    overview: { totalLeads: leads.length, generated: reports.filter(r => r.status === 'done').length, failed: reports.filter(r => r.status === 'failed').length,
      avgReportScore: avg(reports.filter(r => r.status === 'done' && r.score != null).map(r => r.score)), mostCommonIndustry: industryBreakdown[0]?.name || 'N/A',
      topPersona: [...personaPerformance].sort((a,b) => b.count-a.count)[0]?.persona || 'N/A', peakSubmissionDay: Object.entries(dayCounts).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A' },
    industryBreakdown, personaPerformance, signalHeatmap: heatmap,
    sparks: { leads: dates.map(date => leads.filter(l => new Date(l.createdAt).toISOString().slice(0,10) === date).length), generated: spark(r => r.status === 'done'), failed: spark(r => r.status === 'failed') },
    trendIntelligence: leads.length < 10 ? 'Not enough submissions for a reliable trend.' : `${leads.length} inbound leads and ${downloaded.size} prospects with a recorded PDF download in the last 30 days.`,
    conversionDefinition: 'Share of inbound leads with a recorded PDF download; this is engagement, not a sale.', timeZone: 'UTC', periodDays: 30,
  };
}
