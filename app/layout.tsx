import type { Metadata } from "next";
import "@/styles/globals.css";
import "@/styles/research.css";


export const metadata: Metadata = {
  title: "ArthAI | Company research",
  description:
    "Request private company research with cited findings and practical next steps.",
  keywords: ["AI personalization", "inbound automation", "lead intelligence", "B2B automation"],
  openGraph: {
    title: "ArthAI | Company research",
    description: "Private company research grounded in public evidence.",
    type: "website",
  },
};

import { ThemeProvider } from "@/components/ThemeProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body style={{ "--font-inter": "Arial, sans-serif", "--font-manrope": "Arial, sans-serif" } as React.CSSProperties}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
