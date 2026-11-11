import { buildCompanyProfile } from "@/lib/companyProfile";
import { EvidenceRule } from "@/components/EvidenceRule";
import { PublicHeader } from "@/components/ResearchShell";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-static";

interface Props {
  params: Promise<{ company: string }>;
}

async function companySlug(params: Props["params"]) {
  const slug = (await params).company.toLowerCase();
  if (!/^[a-z0-9-]{2,60}$/i.test(slug)) notFound();
  return slug;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = (await companySlug(params)).replaceAll("-", " ");
  return {
    title: `${name} × ArthAI | Company report request`,
    description: `Request source-backed company research for ${name}.`,
  };
}

export default async function CompanyPage({ params }: Props) {
  const profile = await buildCompanyProfile(await companySlug(params));
  const request = `/form?company=${encodeURIComponent(profile.name)}`;

  return (
    <>
      <PublicHeader><Link href={request} className="ui-button">Request a report</Link></PublicHeader>
      <main className="ui-document">
        <header className="ui-document-cover">
          <h1 className="ui-display">{profile.headline}</h1>
          <p>{profile.description}</p>
          <div className="ui-document-actions"><Link href={request} className="ui-button">Start a request →</Link></div>
        </header>
        <section className="ui-document-section">
          <h2 className="ui-step-title">Questions for your request</h2>
          <EvidenceRule />
          <ul className="ui-ruled-list">{profile.painPoints.map(question => <li key={question}>{question}</li>)}</ul>
        </section>
        <section className="ui-document-section">
          <h2 className="ui-step-title">What the report can cover</h2>
          <EvidenceRule />
          <ul className="ui-ruled-list">{profile.aiOpportunities.map(opportunity => <li key={opportunity}>{opportunity}</li>)}</ul>
          <p>{profile.ctaLine}</p>
          <div className="ui-document-actions"><Link href={request} className="ui-text-link">Request company research →</Link></div>
        </section>
      </main>
    </>
  );
}
