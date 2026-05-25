import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ReportChatUI from "./ReportChatUI";

export default async function ReportPage(props: any) {
  const params = await props.params;
  const { id } = params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: { company: true }
  });

  if (!report) return notFound();

  return (
    <div className="flex flex-col md:flex-row h-screen w-full overflow-hidden" style={{ background: "#F5F0E6" }}>
      {/* Left: PDF Viewer Pane (65%) */}
      <div className="flex flex-col w-full md:w-[65%] h-[400px] md:h-full border-b md:border-b-0 md:border-r" style={{ borderColor: "#E8E0D0", background: "#FDFAF4" }}>
        
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "#E8E0D0" }}>
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-sm font-medium mr-2" style={{ color: "#9C845F", textDecoration: "none" }}>← Back</a>
            <div className="w-6 h-6 rounded bg-[#F5F0E6] flex items-center justify-center text-xs font-bold" style={{ color: "#2C1A0E" }}>
              {report.company.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-base font-semibold m-0" style={{ fontFamily: "var(--font-display, serif)", color: "#2C1A0E" }}>
              {report.company.name} Intelligence Report
            </h1>
          </div>
          <a 
            href={`/api/leads/${id}/download`} 
            download
            className="text-sm font-medium px-4 py-1.5 rounded-full transition-colors"
            style={{ color: "#C4922A", border: "1px solid #C4922A", textDecoration: "none" }}
            onMouseOver={(e) => { e.currentTarget.style.background = "#F5F0E6" }}
            onMouseOut={(e) => { e.currentTarget.style.background = "transparent" }}
          >
            Download PDF
          </a>
        </div>
        
        {/* PDF Toolbar */}
        <div className="flex items-center justify-between px-6 py-2 border-b text-xs" style={{ borderColor: "#E8E0D0", color: "#9C845F" }}>
          <div className="flex items-center gap-4">
            <button className="hover:text-[#2C1A0E] transition-colors">← Prev Page</button>
            <span>Page 1 of 6</span>
            <button className="hover:text-[#2C1A0E] transition-colors">Next Page →</button>
          </div>
          <div className="flex items-center gap-4">
            <button className="hover:text-[#2C1A0E] transition-colors">🔍 -</button>
            <span>100%</span>
            <button className="hover:text-[#2C1A0E] transition-colors">🔍 +</button>
          </div>
        </div>

        {/* PDF Iframe */}
        <div className="flex-1 w-full overflow-hidden relative">
          {/* Skeleton Shimmer Background (shows behind iframe while loading) */}
          <div className="absolute inset-0 z-0 animate-pulse" style={{ background: "linear-gradient(90deg, #F5F0E6 0%, #FDFAF4 50%, #F5F0E6 100%)", backgroundSize: "200% 100%" }}></div>
          <iframe 
            src={`/api/leads/${id}/download#toolbar=0`} 
            className="w-full h-full relative z-10"
            style={{ border: "none" }}
            title={`Report for ${report.company.name}`}
          />
        </div>
      </div>

      {/* Right: AI Chat Pane (35%) */}
      <div className="w-full md:w-[35%] h-[calc(100vh-400px)] md:h-full flex flex-col" style={{ background: "#FDFAF4" }}>
        <ReportChatUI report={report} />
      </div>
    </div>
  );
}
