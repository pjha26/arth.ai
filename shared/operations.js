export function summarizeOperations(reports, calls) {
  const completed = reports.filter(report => report.status === 'done');
  const times = completed.filter(report => report.generatedAt != null).map(report => new Date(report.generatedAt) - new Date(report.createdAt)).filter(time => Number.isFinite(time) && time >= 0).sort((a, b) => a - b);
  const callTimes = calls.map(call => call.durationMs).filter(time => Number.isFinite(time) && time >= 0).sort((a, b) => a - b);
  const percentile = (values, p) => values.length ? values[Math.max(0, Math.ceil(values.length * p) - 1)] : null;
  const unknownCostCalls = calls.filter(call => call.estimatedCostUSD == null).length;
  const knownEstimateUSD = calls.reduce((total, call) => total + (call.estimatedCostUSD || 0), 0);
  return {
    sampledReports: reports.length, completed: completed.length, failed: reports.filter(report => report.status === 'failed').length,
    pending: reports.filter(report => ['pending', 'processing'].includes(report.status)).length,
    failureRate: reports.length ? reports.filter(report => report.status === 'failed').length / reports.length : null,
    completionTimeMs: { p50: percentile(times, 0.5), p95: percentile(times, 0.95), includesQueueAndRetryTime: true },
    modelCallTimeMs: { p50: percentile(callTimes, 0.5), p95: percentile(callTimes, 0.95) },
    recordedModelCalls: calls.length, failedModelCalls: calls.filter(call => call.status === 'failed').length,
    recordedInputTokens: calls.reduce((total, call) => total + (call.inputTokens || 0), 0),
    recordedOutputTokens: calls.reduce((total, call) => total + (call.outputTokens || 0), 0),
    unknownUsageCalls: calls.filter(call => call.inputTokens == null || call.outputTokens == null).length,
    cost: { estimatedTotalUSD: calls.length && !unknownCostCalls ? knownEstimateUSD : null, knownEstimateUSD, unknownCostCalls, estimateOnly: true },
    note: 'Recorded operations only; missing telemetry and provider retries may not appear. Cost requires configured account/model rates and is not a provider invoice.',
  };
}
