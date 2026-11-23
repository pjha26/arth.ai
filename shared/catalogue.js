import { parse } from 'csv-parse/sync';
import { isIP } from 'node:net';
import { z } from 'zod';
import { publicUrl } from './network.js';

export const catalogueColumns = ['name', 'website', 'country', 'region', 'city', 'industry', 'source'];
export const catalogueByteLimit = 256 * 1024;
export const catalogueRowLimit = 1000;
const clean = value => value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
const field = max => z.string().max(max).refine(value => !/[\u0000-\u001f\u007f]/u.test(value), 'Contains a control character').transform(clean);
const required = max => field(max).pipe(z.string().min(1).max(max));
const rowSchema = z.object({
  name: required(200), website: z.string().trim().min(1).max(500),
  country: required(100), region: field(100), city: required(100), industry: required(100), source: required(300),
});

/** @param {{country?: string | null, region?: string | null, city?: string | null, industry?: string | null}} values */
export function catalogueFilters(values) {
  const where = {};
  for (const key of ['country', 'region', 'city', 'industry']) {
    const value = clean(values[key] ?? '');
    if (value.length > 100) throw new Error('Filters must be at most 100 characters.');
    if (value) where[`${key}Key`] = value.toLowerCase();
  }
  return where;
}

/** @param {string} csv */
export function parseCatalogue(csv) {
  if (Buffer.byteLength(csv, 'utf8') > catalogueByteLimit) throw new Error('CSV must be 256 KiB or smaller.');
  let entries;
  try {
    entries = parse(csv, {
      bom: true, skip_empty_lines: true, max_record_size: 4000, to: catalogueRowLimit + 1, info: true,
      columns: fields => {
        const headers = fields.map(field => field.trim().toLowerCase());
        if (headers.length !== catalogueColumns.length || new Set(headers).size !== headers.length
          || catalogueColumns.some(field => !headers.includes(field))) throw new Error('Invalid headers');
        return headers;
      },
    });
  } catch (error) {
    if (error.message === 'Invalid headers') throw new Error(`CSV headers must be: ${catalogueColumns.join(',')}.`);
    throw new Error(Number.isInteger(error.lines) ? `CSV format error near line ${error.lines}.` : 'CSV format could not be read.');
  }
  if (!entries.length) throw new Error('Add at least one business row.');
  if (entries.length > catalogueRowLimit) throw new Error('Import at most 1,000 rows per file.');

  const rows = [], seen = new Set();
  let duplicates = 0;
  for (const { record, info } of entries) {
    const input = rowSchema.safeParse(record);
    if (!input.success) {
      const fields = [...new Set(input.error.issues.map(issue => issue.path.join('.')))];
      throw new Error(`Invalid or missing field at CSV line ${info.lines}: ${fields.join(', ')}.`);
    }
    const { name, website, country, region, city, industry, source } = input.data;
    let url;
    try {
      url = publicUrl(website);
      const host = url.hostname.replace(/^\[|\]$/g, '');
      if (isIP(host) || !host.includes('.') || host.endsWith('.')) throw new Error('Expected a domain');
    } catch { throw new Error(`Enter a public business website at CSV line ${info.lines}.`); }
    const domain = url.hostname.replace(/^www\./i, '');
    const keys = { countryKey: country.toLowerCase(), regionKey: region.toLowerCase(), cityKey: city.toLowerCase(), industryKey: industry.toLowerCase() };
    const identity = JSON.stringify([domain, keys.countryKey, keys.regionKey, keys.cityKey]);
    if (seen.has(identity)) { duplicates++; continue; }
    seen.add(identity);
    rows.push({ name, domain, website: url.origin, country, region, city, industry, source, ...keys });
  }
  return { rows, duplicates };
}
