import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

export function Wordmark() {
  return <Link href="/" className="ui-wordmark" aria-label="ArthAI home">Arth<span>AI</span></Link>;
}

export function PublicHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="ui-public-header">
      <Wordmark />
      <div className="ui-header-actions">{children}<ThemeToggle /></div>
    </header>
  );
}

export function IntakeShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="ui-intake">
      <div className="ui-intake-art" aria-hidden="true">
        <Image src="/research-dossier.webp" alt="" fill sizes="(max-width: 760px) 0px, 38vw" loading="eager" />
        <span>ArthAI · Research dossier</span>
      </div>
      <div className="ui-intake-content">
        <PublicHeader />
        <main className="ui-intake-main">
          <h1 className="ui-display">{title}</h1>
          <p className="ui-intro">{description}</p>
          {children}
        </main>
      </div>
    </div>
  );
}
