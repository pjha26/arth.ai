import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import LeadChatUI from "./LeadChatUI";
import Link from "next/link";

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
    <div className="min-h-screen relative font-['Geist',_sans-serif] text-[#1b1b1b]" style={{ backgroundColor: "#fcf9f8" }}>
      {/* Subtle ambient background */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 0%, rgba(251, 186, 111, 0.08), transparent 70%)" }} />

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 bg-[#fcf9f8]/80 backdrop-blur-xl border-b border-[#d5c3b3]/30 sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 decoration-transparent">
          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#fbba6f]">
            <span className="w-2 h-2 rounded-full bg-[#845411]"></span>
          </div>
          <span className="font-['Newsreader',_serif] text-xl font-bold tracking-tight text-[#1b1b1b]">ArthAI</span>
        </Link>
        <div className="flex items-center gap-4">
          {report.status === "done" && (
            <a 
              href={initialData.pdfUrl}
              download
              className="text-sm font-medium text-[#514538] hover:text-[#845411] transition-colors border border-[#d5c3b3]/50 bg-white/50 px-4 py-2 rounded-full shadow-sm"
            >
              Download PDF
            </a>
          )}
        </div>
      </nav>

      {/* Main Layout */}
      <main className="relative flex-1 flex flex-col max-w-5xl mx-auto w-full p-4 md:p-8 h-[calc(100vh-73px)] z-10">
        
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f6f3f2] border border-[#d5c3b3]/50 mb-4">
            <span className="w-2 h-2 rounded-full bg-[#fbba6f] animate-pulse" />
            <span className="text-[10px] font-bold tracking-widest uppercase text-[#514538]">Intelligence Report</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-['Newsreader',_serif] font-normal text-[#1b1b1b] tracking-tight mb-4">
            {companyName}
          </h1>
          <p className="text-[#514538] text-base max-w-2xl mx-auto leading-relaxed">
            {initialData.executiveSummary}
          </p>
        </div>

        {/* Chat Interface Container */}
        <div className="flex-1 bg-white/60 backdrop-blur-xl border border-[#d5c3b3]/40 rounded-2xl shadow-[0_8px_32px_rgba(213,195,179,0.2)] overflow-hidden flex flex-col relative">
          {report.status !== "done" ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#514538]">
              <span className="material-symbols-outlined text-4xl mb-3 text-[#fbba6f] animate-pulse">hourglass_empty</span>
              <p className="font-medium text-[#1b1b1b] text-lg font-['Newsreader',_serif]">Analyzing Intent Signals...</p>
              <p className="text-sm mt-1">Your report is currently processing. Chat will be enabled shortly.</p>
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
