import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { z } from 'zod';
import { guard } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { limitRequest } from '@/lib/rateLimit';

export async function POST(request: Request) {
  const denied = await guard(request); if (denied) return denied;
  const limited = await limitRequest(request, 'monitor', 3, 3600, 20); if (limited) return limited;
  const parsed = z.object({ companyIds: z.array(z.string().uuid()).min(1).max(10) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ message: 'Select 1–10 company IDs to monitor daily' }, { status: 400 });
  const companies = await prisma.company.findMany({ where: { id: { in: parsed.data.companyIds } }, select: { id: true } });
  const connection = new IORedis(process.env.UPSTASH_REDIS_URL!, { maxRetriesPerRequest: 1, enableOfflineQueue: false, connectTimeout: 5000, commandTimeout: 5000 });
  const queue = new Queue('monitoring', { connection });
  try {
    for (const company of companies) await queue.upsertJobScheduler(`daily-${company.id}`, { every: 86400000 }, { name: 'check-company', data: { companyId: company.id }, opts: { attempts: 2, removeOnComplete: 100, removeOnFail: 100 } });
    return Response.json({ success: true, message: `${companies.length} companies scheduled for daily monitoring` });
  } catch { return Response.json({ message: 'Monitoring queue unavailable' }, { status: 503 }); }
  finally { await queue.close(); connection.disconnect(); }
}
