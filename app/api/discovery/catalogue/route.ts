import { guard } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { catalogueFilters, parseCatalogue } from '@/shared/catalogue.js';
import { pageNumber } from '@/shared/pagination.js';
import { readBoundedJson } from '@/shared/request-json.js';
import { z } from 'zod';

const noStore = { 'Cache-Control': 'no-store' };
const disabled = () => Response.json({ message: 'The CSV catalogue is not enabled.' }, { status: 503, headers: noStore });

export async function GET(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  if (process.env.ENABLE_CSV_CATALOGUE !== 'true') return disabled();

  const query = new URL(request.url).searchParams;
  const page = pageNumber(query.get('page'));
  if (page === null || page > 1000) return Response.json({ message: 'Enter a page between 1 and 1000.' }, { status: 400, headers: noStore });
  let where;
  try {
    where = catalogueFilters({ country: query.get('country'), region: query.get('region'), city: query.get('city'), industry: query.get('industry') });
  } catch {
    return Response.json({ message: 'Filters must be at most 100 characters.' }, { status: 400, headers: noStore });
  }
  try {
    const rows = await prisma.catalogueCompany.findMany({
      where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (page - 1) * 50, take: 51,
      select: { id: true, name: true, website: true, country: true, region: true, city: true, industry: true, source: true },
    });
    return Response.json({ rows: rows.slice(0, 50), page, hasMore: rows.length > 50 && page < 1000 }, { headers: noStore });
  } catch {
    return Response.json({ message: 'Catalogue search is temporarily unavailable.' }, { status: 503, headers: noStore });
  }
}

export async function POST(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  if (process.env.ENABLE_CSV_CATALOGUE !== 'true') return disabled();

  const body = await readBoundedJson(request, 512 * 1024);
  if (body.response) return body.response;
  const input = z.object({ csv: z.string() }).safeParse(body.value);
  if (!input.success) return Response.json({ message: 'Provide a CSV file.' }, { status: 400, headers: noStore });

  let batch;
  try {
    batch = parseCatalogue(input.data.csv);
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : 'Invalid CSV.' }, { status: 400, headers: noStore });
  }
  try {
    const result = await prisma.catalogueCompany.createMany({ data: batch.rows, skipDuplicates: true });
    return Response.json({ imported: result.count, duplicates: batch.duplicates + batch.rows.length - result.count }, { headers: noStore });
  } catch {
    return Response.json({ message: 'Catalogue import is temporarily unavailable.' }, { status: 503, headers: noStore });
  }
}
