import type { PrismaClient } from '@prisma/client';

export async function createCatalogueReport(db: PrismaClient, id: string, requestedSequence: number) {
  return db.$transaction(async tx => {
    const [locked] = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "CatalogueCompany" WHERE id = ${id} FOR UPDATE`;
    if (!locked) return { jobId: null, reason: 'missing' } as const;

    const entry = await tx.catalogueCompany.findUniqueOrThrow({ where: { id } });
    if (entry.researchReportId) return { jobId: entry.researchReportId, created: false } as const;
    if (!entry.shortlistedAt) return { jobId: null, reason: 'shortlist' } as const;
    if (entry.researchSequence !== requestedSequence) return { jobId: null, reason: 'changed' } as const;

    const company = await tx.company.upsert({
      where: { domain: entry.domain }, update: {},
      create: { domain: entry.domain, website: entry.website, name: entry.name, industry: entry.industry },
      select: { id: true },
    });
    const location = [entry.city, entry.region, entry.country].filter(Boolean).join(', ');
    const lead = await tx.lead.create({
      data: {
        companyId: company.id,
        source: 'catalogue',
        outreachConsent: false,
        painPoints: `Assess publicly documented fit for ${entry.industry} in ${location}. The imported location is unverified.`,
      },
      select: { id: true },
    });
    const report = await tx.report.create({
      data: { companyId: company.id, leadId: lead.id, deliveryStatus: 'skipped' },
      select: { id: true },
    });
    await tx.catalogueCompany.update({ where: { id }, data: { researchReportId: report.id, researchSequence: { increment: 1 } } });
    return { jobId: report.id, created: true } as const;
  });
}
