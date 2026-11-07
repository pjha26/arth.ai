export function candidateFit(input, candidate, page) {
  const text = `${page.title} ${page.description} ${page.markdown}`.toLowerCase();
  const normalize = value => value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const nameWords = normalize(candidate.name).split(' ').filter(w => w.length > 2);
  const identityMatch = nameWords.length > 0 && nameWords.every(word => normalize(text).includes(word));
  const regions = input.region.split(',').map(normalize).filter(Boolean);
  const regionMatch = regions.length > 0 && regions.every(part => normalize(candidate.address).includes(part));
  const industryMatch = text.includes(input.industry.toLowerCase());
  const size = text.match(/\b(\d[\d,]*)\s+(?:employees|team members)\b/i);
  const employeeCount = size ? Number(size[1].replaceAll(',', '')) : null;
  const sizeRequired = input.sizeMin != null || input.sizeMax != null;
  const sizeMatch = !sizeRequired || employeeCount != null && employeeCount >= (input.sizeMin ?? 0) && employeeCount <= (input.sizeMax ?? Infinity);
  const signalMatch = !input.signal || text.includes(input.signal.toLowerCase());
  const eligible = identityMatch && regionMatch && industryMatch && sizeMatch && signalMatch;
  return { eligible, score: [identityMatch, regionMatch, industryMatch, sizeMatch, signalMatch].filter(Boolean).length / 5,
    reasons: [`Identity: ${identityMatch ? 'website matches listing name' : 'not established'}`, `Region: ${regionMatch ? 'listing address matches' : 'not established'}`,
      `Industry: ${industryMatch ? 'website keyword match' : 'not established'}`, `Size: ${employeeCount == null ? 'not established' : `${employeeCount} employees, website self-report`}`,
      `Signal: ${input.signal ? signalMatch ? 'keyword found; not a verified dated event' : 'not found' : 'not requested'}`] };
}
