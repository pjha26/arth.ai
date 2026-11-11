"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "./ResearchShell";
import { ThemeToggle } from "./ThemeToggle";
import { SessionForm } from "./SessionForm";

const links = [
  { href: "/dashboard", icon: "space_dashboard", label: "Workspace" },
  { href: "/dashboard/needs-review", icon: "fact_check", label: "Needs review" },
  { href: "/dashboard/discover", icon: "search", label: "Discovery" },
];

export function WorkspaceNav() {
  const pathname = usePathname();
  const active = pathname.startsWith("/dashboard/reports/") ? "/dashboard" : pathname;
  return (
    <aside className="ui-workspace-nav">
      <div className="ui-workspace-brand"><Wordmark /><ThemeToggle /></div>
      <p className="ui-label">Research workspace</p>
      <nav aria-label="Workspace">
        {links.map(({ href, icon, label }) => (
          <Link key={href} href={href} aria-current={href === active ? "page" : undefined}>
            <span className="material-symbols-outlined" aria-hidden="true">{icon}</span>{label}
          </Link>
        ))}
      </nav>
      <div className="ui-workspace-footer">
        <SessionForm mode="logout" />
      </div>
    </aside>
  );
}
