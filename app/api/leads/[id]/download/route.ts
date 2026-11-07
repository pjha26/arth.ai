import { prisma } from '@/lib/prisma';
import { accessFor, guard } from '@/lib/auth';
import { readReportPdf } from '@/shared/storage.js';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const denied = await guard(request, id); if (denied) return denied;
  const report = await prisma.report.findUnique({ where: { id }, include: { company: true } });
  const access = await accessFor(id);
  if (!report || !access?.staff && report.leadId !== access?.leadId) return new Response('Report not found', { status: 404 });
  if (!report.pdfUrl || report.artifactStatus !== 'ready') return Response.json({ message: 'PDF is not available yet' }, { status: 404 });
  try {
    const bytes = await readReportPdf(report.pdfUrl);
    await prisma.reportEvent.create({ data: { reportId: id, type: 'download', actor: access.staff ? 'staff' : access.leadId } });
    const name = report.company.name.replace(/[^a-z0-9_-]/gi, '_');
    return new Response(new Uint8Array(bytes), { headers: { 'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${name}-arth-report.pdf"`, 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('PDF storage read failed', error);
    return Response.json({ message: 'PDF storage is temporarily unavailable' }, { status: 503 });
  }
}
