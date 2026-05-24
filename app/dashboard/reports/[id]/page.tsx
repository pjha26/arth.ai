import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReportChatUI from "./ReportChatUI";

export default async function ReportPage(props: any) {
  // App Router params can be a Promise in Next.js 15, so await it
  const params = await props.params;
  const { id } = params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: { company: true }
  });

  if (!report) return notFound();

  return (
    <div className="flex h-screen w-full" style={{ background: "var(--c-bg, #F5F0E6)" }}>
      {/* Left: PDF Viewer Pane */}
      <div className="flex-1 h-full border-r" style={{ borderColor: "var(--c-border, #EAE2D2)", background: "#fff" }}>
        {/* Simple header */}
        <div className="flex items-center px-6 py-4 border-b" style={{ borderColor: "var(--c-border, #EAE2D2)", background: "var(--c-surface, #FDFAF4)" }}>
          <a href="/dashboard" className="mr-4 text-sm font-medium" style={{ color: "var(--c-muted, #9C845F)", textDecoration: "none" }}>← Back to Dashboard</a>
          <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display, serif)", color: "var(--c-heading, #1C0F05)" }}>
            {report.company.name} Intelligence Report
          </h1>
        </div>
        
        {/* PDF Iframe */}
        <iframe 
          src={`/api/leads/${id}/download`} 
          className="w-full"
          style={{ height: "calc(100vh - 61px)", border: "none" }}
          title={`Report for ${report.company.name}`}
        />
      </div>

      {/* Right: AI Chat Pane */}
      <div className="w-[450px] h-full flex flex-col" style={{ background: "var(--c-sidebar, #FEFCF7)" }}>
        <ReportChatUI reportId={id} companyName={report.company.name} personaType={report.personaType} />
      </div>
    </div>
  );
}
