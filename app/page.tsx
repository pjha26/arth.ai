import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { EvidenceRule } from "@/components/EvidenceRule";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DossierReveal } from "@/components/DossierReveal";
import { researchFocuses } from "@/lib/research-focus";
import styles from "./landing.module.css";

const title = "ArthAI | Company research worth opening";
const description =
  "Share a company website and a business challenge. Get a private report with cited findings and a practical next step.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, type: "website" },
};

const steps = [
  {
    title: "Share a website",
    description: "Tell us which company to research and what challenge you’re working on.",
  },
  {
    title: "Trace the evidence",
    description: "ArthAI looks for relevant public sources and cites the evidence behind its findings.",
  },
  {
    title: "Review your report",
    description: "Open your private report and see what the evidence suggests doing next.",
  },
];

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d={diagonal ? "M4 12 12 4M5 4h7v7" : "M2.5 8h11M9 3.5 13.5 8 9 12.5"}
        stroke="currentColor"
        strokeWidth="1.25"
      />
    </svg>
  );
}

function RequestLink({ accent = false }: { accent?: boolean }) {
  return (
    <Link className={accent ? `${styles.button} ${styles.accentButton}` : styles.button} href="/form">
      Request a report <Arrow />
    </Link>
  );
}

export default function Home() {
  return (
    <div className={styles.landing}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link className={styles.wordmark} href="/" aria-label="ArthAI home">
            Arth<span>AI</span>
          </Link>
          <nav className={styles.nav} aria-label="Main navigation">
            <Link href="#how-it-works">How it works</Link>
            <Link href="#sample-report">Sample report</Link>
            <Link href="#workspace">The CRM</Link>
            <Link href="/login">Staff login</Link>
          </nav>
          <div className={styles.headerActions}><ThemeToggle /><RequestLink accent /></div>
        </header>

        <main>
          <section className={styles.hero} aria-labelledby="hero-title">
            <div className={styles.heroCopy}>
              <h1 id="hero-title">
                Company research<br /><em>worth opening.</em>
              </h1>
              <p>{description}</p>
              <div className={styles.actions}>
                <RequestLink />
                <Link className={styles.textLink} href="#sample-report">View sample <Arrow diagonal /></Link>
              </div>
            </div>
            <figure className={styles.heroFigure}>
              <div className={styles.heroImage}>
                <Image
                  src="/research-dossier.webp"
                  alt=""
                  fill
                  sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1400px) 50vw, 670px"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
              <figcaption>
                <span>FIG. 01</span>
                <span>The research dossier</span>
              </figcaption>
            </figure>
          </section>

          <section className={styles.researchKit} aria-labelledby="kit-title">
            <div className={styles.sectionHeading}>
              <h2 id="kit-title">A clearer starting point.</h2>
              <p>From a company website to a more informed conversation.</p>
            </div>
            <div className={styles.kitItems}>
              <article><span className={styles.kitNumber}>01</span><h3>Research you can trace</h3><p>Findings connect back to public source excerpts, so you can check the evidence.</p></article>
              <article><span className={styles.kitNumber}>02</span><h3>A private research dossier</h3><p>Review your company report online and download its PDF when it’s ready.</p></article>
              <article><span className={styles.kitNumber}>03</span><h3>Room for a follow-up</h3><p>Ask the report chat about a finding, a recommendation, or a question still open.</p></article>
            </div>
          </section>

          <section className={styles.focus} aria-labelledby="focus-title">
            <div className={styles.sectionHeading}>
              <h2 id="focus-title">Start with a question that matters.</h2>
              <p>Choose a focus. Your request will carry it into the research.</p>
            </div>
            <div className={styles.focusItems}>
              {researchFocuses.map((focus, index) => (
                <Link key={focus.challenge} href={`/form?focus=${encodeURIComponent(focus.challenge)}`} className={styles.focusCard}>
                  <span className={styles.documentLabel}>0{index + 1} / {focus.challenge}</span>
                  <h3>{focus.title}</h3>
                  <p>{focus.description}</p>
                  <span className={styles.textLink}>Research this <Arrow /></span>
                </Link>
              ))}
            </div>
          </section>

          <section id="how-it-works" className={styles.process} aria-labelledby="process-title">
            <h2 id="process-title">How it works</h2>
            <EvidenceRule />
            <ol className={styles.steps}>
              {steps.map((step, index) => (
                <li key={step.title}>
                  <span className={styles.stepNumber} aria-hidden="true">0{index + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </section>

          <section id="sample-report" className={styles.sample} aria-labelledby="sample-title">
            <div className={styles.sampleIntro}>
              <div><p className={styles.sampleLabel}>Sample report</p><EvidenceRule /></div>
              <h2 id="sample-title">See what backs each finding.</h2>
            </div>
            <DossierReveal className={styles.dossierMotion}>
            <article className={styles.dossier} aria-labelledby="dossier-title">
              <p className={styles.documentLabel}>Illustrative report · Fictional company</p>
              <h3 id="dossier-title">Rivermere Tools</h3>
              <p className={styles.researchFocus}><strong>Research focus</strong> Onboarding new customers</p>
              <dl className={styles.reportDetails}>
                <div>
                  <dt>Finding</dt>
                  <dd>New customers rely on live training to get started.</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>
                    <q>Every new account starts with a scheduled training call.</q>
                    <cite>Rivermere Tools · Sample onboarding guide</cite>
                  </dd>
                </div>
                <div className={styles.recommendation}>
                  <dt>Recommended next step</dt>
                  <dd>Test a self-serve setup checklist with a small group of new customers.</dd>
                </div>
              </dl>
            </article>
            </DossierReveal>
          </section>

          <section id="workspace" className={styles.workspace} aria-labelledby="workspace-title">
            <div className={styles.workspaceCopy}>
              <p className={styles.documentLabel}>For the team behind the follow-up</p>
              <h2 id="workspace-title">Keep the context.<br />Move the conversation forward.</h2>
              <p>Bring inbound requests, research reports, and sales outcomes into one staff workspace.</p>
              <ul>
                <li>Track report generation and email status.</li>
                <li>Review inbound alerts and the evidence behind them.</li>
                <li>Record sales outcomes as the relationship develops.</li>
              </ul>
              <Link className={styles.textLink} href="/login">Open the workspace <Arrow diagonal /></Link>
            </div>
            <div className={styles.workspacePreview}>
              <div className={styles.previewHeader}><span>ArthAI</span><span>Illustrative workspace</span></div>
              <h3>Leads &amp; reports</h3>
              <p>Fictional companies shown for illustration.</p>
              <table>
                <caption className="sr-only">Example research and follow-up states</caption>
                <thead><tr><th scope="col">Company</th><th scope="col">Research</th><th scope="col">Sales outcome</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Rivermere Tools</th><td>Ready</td><td>Engaged</td></tr>
                  <tr><th scope="row">Northline Studio</th><td>Processing</td><td>New</td></tr>
                  <tr><th scope="row">Fieldnote Systems</th><td>Ready</td><td>Contacted</td></tr>
                </tbody>
              </table>
              <div className={styles.previewNote}><span aria-hidden="true">↳</span> Research stays alongside the next conversation.</div>
            </div>
          </section>

          <section className={styles.standards} aria-labelledby="standards-title">
            <div className={styles.sectionHeading}><h2 id="standards-title">Know what a finding rests on.</h2><p>The report keeps evidence, gaps, and recommendations visible.</p></div>
            <EvidenceRule />
            <dl>
              <div><dt>Facts carry citations</dt><dd>Source excerpts let you inspect what supports a claim. Company statements remain self-reported.</dd></div>
              <div><dt>Gaps stay visible</dt><dd>Information the available sources don’t establish is recorded as unknown.</dd></div>
              <div><dt>Next steps are proposals</dt><dd>Recommendations suggest what to test. Readiness scores are assessments with stated reasons.</dd></div>
            </dl>
          </section>

          <section className={styles.faq} aria-labelledby="faq-title">
            <h2 id="faq-title">Before you start.</h2>
            <div>
              <details><summary>What should I submit?</summary><p>A public company website, your role, and the business challenge you want the research to address.</p></details>
              <details><summary>Who can access my report?</summary><p>Your report uses a private access link. Authorized staff can also review it in the CRM.</p></details>
              <details><summary>What if there isn’t enough evidence?</summary><p>The request can stop with an insufficient-evidence outcome. Staff can review the request and its available sources.</p></details>
              <details><summary>What happens after the report?</summary><p>Read the findings, ask follow-up questions in report chat, and use the recommendations to decide what to investigate next. Staff can track the sales outcome in the workspace.</p></details>
            </div>
          </section>

          <section className={styles.closing} aria-labelledby="closing-title">
            <h2 id="closing-title">Ready to research a company?</h2>
            <RequestLink />
          </section>
        </main>

        <footer className={styles.footer}>
          <Link className={styles.wordmark} href="/" aria-label="ArthAI home">Arth<span>AI</span></Link>
          <Link className={styles.textLink} href="/login">Staff login <Arrow diagonal /></Link>
        </footer>
      </div>
    </div>
  );
}
