import Link from "next/link";
import { IntakeShell } from "@/components/ResearchShell";
import { SessionForm } from "@/components/SessionForm";

export const metadata = { title: "Team sign in | ArthAI" };

export default function LoginPage() {
  return (
    <IntakeShell title="Team sign in" description="Open the research workspace to review reports and manage inbound leads.">
      <SessionForm mode="login" />
      <p className="ui-footnote">Looking for your report? Open the private link in your email or <Link href="/form">request a report</Link>.</p>
    </IntakeShell>
  );
}
