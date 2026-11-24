import { guard } from '@/lib/auth';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createDeal, dealsEnabled, editDeal } from '@/lib/deals';
import { readBoundedJson } from '@/shared/request-json.js';

function message(text: string, status: number) {
  return Response.json({ message: text }, { status });
}

async function authorize(request: Request) {
  const denied = await guard(request);
  return denied ?? (dealsEnabled() ? null : message('Deal tracking is disabled.', 404));
}

async function recordActivity(tx: Prisma.TransactionClient, id: string, version: number, state: {
  stage: string; nextAction: string | null; nextActionOn: Date | null; outcomeReason: string | null;
}) {
  await tx.dealActivity.create({ data: { ...state, dealId: id, version, actor: 'staff' } });
}

export async function POST(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;
  const body = await readBoundedJson(request, 4096);
  if (body.response) return body.response;
  const input = createDeal.safeParse(body.value);
  if (!input.success) return message('Enter a deal title, next action, and valid date if supplied.', 400);
  const { id, reportId, title, nextAction, nextActionOn } = input.data;
  const state = { stage: 'open', nextAction, nextActionOn: nextActionOn ? new Date(nextActionOn) : null, outcomeReason: null };
  try {
    return await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Report" WHERE id = ${reportId} FOR UPDATE`;
      const existing = await tx.deal.findUnique({ where: { id }, select: {
        reportId: true, title: true,
        activities: { where: { version: 1 }, select: { nextAction: true, nextActionOn: true } },
      } });
      if (existing) {
        const [initial] = existing.activities;
        const sameRequest = existing.reportId === reportId && existing.title === title && initial?.nextAction === nextAction
          && (initial.nextActionOn?.getTime() ?? null) === (state.nextActionOn?.getTime() ?? null);
        return sameRequest ? Response.json({ id }) : message('This request already created a deal. Reload before creating another.', 409);
      }

      const report = await tx.report.findUnique({ where: { id: reportId }, select: { leadId: true, status: true, generationAttempt: true } });
      if (!report) return message('Report not found.', 404);
      if (!report.leadId || report.status !== 'done') return message('Choose a completed report with a linked lead.', 409);
      const review = await tx.leadQualification.findUnique({
        where: { reportId_generationAttempt: { reportId, generationAttempt: report.generationAttempt } },
        select: { decision: true, reviewedAt: true },
      });
      if (review?.decision !== 'qualified') return message('Save a qualified decision on this report first.', 409);

      const inserted = await tx.deal.createMany({ skipDuplicates: true, data: {
        ...state, id, reportId, title, leadId: report.leadId, qualificationReviewedAt: review.reviewedAt,
      } });
      if (!inserted.count) return message('Deal request already used.', 409);
      await recordActivity(tx, id, 1, state);
      return Response.json({ id }, { status: 201 });
    });
  } catch {
    return message('Could not create the deal. Try again.', 503);
  }
}

export async function PATCH(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;
  const body = await readBoundedJson(request, 4096);
  if (body.response) return body.response;
  const input = editDeal.safeParse(body.value);
  if (!input.success) return message('Enter a next action or a reason for closing the deal.', 400);
  const change = input.data;
  const state = change.stage === 'open'
    ? { stage: change.stage, nextAction: change.nextAction, nextActionOn: change.nextActionOn ? new Date(change.nextActionOn) : null, outcomeReason: null }
    : { stage: change.stage, nextAction: null, nextActionOn: null, outcomeReason: change.outcomeReason };
  try {
    return await prisma.$transaction(async tx => {
      const updated = await tx.deal.updateMany({
        where: { id: change.id, version: change.version, stage: 'open' },
        data: { ...state, closedAt: state.stage === 'open' ? null : new Date(), version: { increment: 1 } },
      });
      if (!updated.count) {
        const current = await tx.deal.findUnique({ where: { id: change.id }, select: { stage: true } });
        return current ? message('This deal has changed or closed. Reload to see the latest version.', 409) : message('Deal not found.', 404);
      }
      await recordActivity(tx, change.id, change.version + 1, state);
      return Response.json({ id: change.id });
    });
  } catch {
    return message('Could not save the deal. Try again.', 503);
  }
}
