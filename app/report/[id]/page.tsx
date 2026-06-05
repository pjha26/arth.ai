import { notFound } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import LeadChatUI from "./LeadChatUI";
import Link from "next/link";
import ParticleBackground from "@/components/ParticleBackground";
import CustomCursor from "@/components/CustomCursor";

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

  const companyName = report.company?.name || "Your Company";
  
  const initialData = {
    reportId: report.id,
    companyName: companyName,
    executiveSummary: report.aiSummary || "Your intelligence report has been generated.",
    pdfUrl: `/api/leads/${report.id}/download`,
    status: report.status
  };

  return (
    <div className="min-h-screen relative font-['Geist',_sans-serif] text-[#1b1b1b] overflow-hidden">
      <CustomCursor />
      <ParticleBackground />

      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-5 bg-[#fcf9f8]/60 backdrop-blur-2xl border-b border-[#d5c3b3]/40 sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2 decoration-transparent">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#fbba6f] shadow-[0_2px_8px_rgba(251,186,111,0.4)]">
            <span className="w-3 h-3 rounded-full bg-[#845411]"></span>
          </div>
          <span className="font-['Newsreader',_serif] text-2xl font-bold tracking-tight text-[#1b1b1b]">ArthAI</span>
        </Link>
        <div className="flex items-center gap-4">
          {report.status === "done" && (
            <a 
              href={initialData.pdfUrl}
              download
              className="text-sm font-semibold text-[#845411] hover:text-white transition-all border border-[#d5c3b3]/80 hover:border-[#845411] bg-white/70 hover:bg-[#845411] px-5 py-2.5 rounded-full shadow-sm hover:shadow-md backdrop-blur-md"
            >
              Download PDF
            </a>
          )}
        </div>
      </nav>

      {/* Main Layout */}
      <main className="relative z-10 max-w-5xl mx-auto w-full px-4 py-8 flex flex-col items-center h-[calc(100vh-80px)]">
        
        {/* Header Section */}
        <div className="mb-6 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-md border border-[#d5c3b3]/60 mb-5 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-[#fbba6f] animate-pulse shadow-[0_0_8px_rgba(251,186,111,0.6)]" />
            <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-[#845411]">Intelligence Report</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-['Newsreader',_serif] font-normal text-[#1b1b1b] tracking-tight mb-4 leading-tight">
            {companyName}
          </h1>
          <p className="text-[#514538] text-[15px] leading-relaxed bg-white/60 backdrop-blur-md p-4 rounded-[20px] border border-white/80 shadow-sm max-w-2xl mx-auto">
            {initialData.executiveSummary}
          </p>
        </div>

        {/* Chat Interface Container - fully glassmorphic card */}
        <div 
          className="w-full flex-1 backdrop-blur-3xl border rounded-[32px] overflow-hidden flex flex-col relative mb-4 mx-auto"
          style={{ 
            maxWidth: '900px', 
            backgroundColor: 'rgba(252,249,248,0.5)', 
            borderColor: 'rgba(255,255,255,0.6)',
            boxShadow: '0 24px 64px -12px rgba(132,84,17,0.15), 0 0 0 1px rgba(213,195,179,0.3)' 
          }}
        >
          {report.status !== "done" ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#514538] p-12">
              <span className="material-symbols-outlined text-5xl mb-4 text-[#fbba6f] animate-pulse">hourglass_empty</span>
              <p className="font-medium text-[#1b1b1b] text-xl font-['Newsreader',_serif]">Analyzing Intent Signals...</p>
              <p className="text-sm mt-2 opacity-80">Your report is currently processing. Chat will be enabled shortly.</p>
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
