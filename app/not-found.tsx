import Link from "next/link";
import { PublicHeader } from "@/components/ResearchShell";

export default function NotFound() {
  return (
    <>
      <PublicHeader />
      <main className="ui-document">
        <header className="ui-document-cover">
          <h1 className="ui-display">Page unavailable</h1>
          <p>Check the address. If you’re opening a private report, use the link in your email.</p>
          <div className="ui-document-actions"><Link className="ui-button" href="/">Back to ArthAI →</Link></div>
        </header>
      </main>
    </>
  );
}
