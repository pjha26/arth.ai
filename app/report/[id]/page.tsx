import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import LeadChatUI from "./LeadChatUI";

const prisma = new PrismaClient();

export default async function PublicReportPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      company: true,
    }
  });

  if (!report) {
    return notFound();
  }

  // Fallback to "Your Company" if company or name is missing for some reason
  const companyName = report.company?.name || "Your Company";
  
  // We'll pass some basic context to the client UI
  const initialData = {
    reportId: report.id,
    companyName: companyName,
    executiveSummary: report.aiSummary || "Your intelligence report has been generated.",
    pdfUrl: `/api/leads/${report.id}/download`,
    status: report.status
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col font-sans">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-[#E8E6E1] sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center bg-[#18181B] text-white font-black text-xs">
            a
          </div>
          <span className="font-extrabold text-[#18181B] tracking-tight">arth.ai</span>
        </div>
        <div className="flex items-center gap-4">
          {report.status === "done" && (
            <a 
              href={initialData.pdfUrl}
              download
              className="text-xs font-bold text-[#71717A] hover:text-[#18181B] transition-colors"
            >
              Download PDF
            </a>
          )}
        </div>
      </nav>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 md:p-8 h-[calc(100vh-65px)]">
        
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#18181B] tracking-tight mb-2">
            Intelligence Report: {companyName}
          </h1>
          <p className="text-[#71717A] text-sm max-w-3xl leading-relaxed">
            {initialData.executiveSummary}
          </p>
        </div>

        {/* Chat Interface Container */}
        <div className="flex-1 bg-white border border-[#E8E6E1] rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {report.status !== "done" ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#71717A]">
              <span className="material-symbols-outlined text-4xl mb-2 text-[#E8E6E1] animate-pulse">hourglass_empty</span>
              <p className="font-medium">Your report is currently processing.</p>
              <p className="text-xs mt-1">Chat will be enabled once the audit completes.</p>
            </div>
          ) : (
            <LeadChatUI 
              reportId={initialData.reportId} 
              companyName={initialData.companyName}
            />
          )}
        </div>
      </main>
    </div>
  );
}
