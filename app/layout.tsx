import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "arth.ai — Every lead gets a personal touch before you lift a finger.",
  description:
    "arth.ai captures a lead, researches their company, writes a tailored audit report, and emails it to them — all before you finish your chai.",
  keywords: ["AI personalization", "inbound automation", "lead intelligence", "B2B automation"],
  openGraph: {
    title: "arth.ai — AI-Powered Inbound Personalization",
    description: "Instant, hyper-personalized AI audit reports delivered the moment a prospect submits your form.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
