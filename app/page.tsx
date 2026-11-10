import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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
            <Link href="/login">Staff login</Link>
          </nav>
          <RequestLink accent />
        </header>

        <main>
          <section className={styles.hero} aria-labelledby="hero-title">
            <div className={styles.heroCopy}>
              <h1 id="hero-title">
                Company<br />research<br /><em>worth opening.</em>
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

          <section id="how-it-works" className={styles.process} aria-labelledby="process-title">
            <h2 id="process-title">How it works</h2>
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
              <p className={styles.sampleLabel}>Sample report</p>
              <h2 id="sample-title">See what backs each finding.</h2>
            </div>
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
