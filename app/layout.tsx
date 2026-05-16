import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "arth.ai — Every lead gets a personal touch before you lift a finger.",
  description:
    "arth.ai captures a lead, researches their company, writes a tailored audit report, and emails it to them — all before you finish your chai.",
  keywords: ["AI personalization", "inbound automation", "lead intelligence", "AI audit report", "B2B automation"],
  openGraph: {
    title: "arth.ai — AI-Powered Inbound Personalization",
    description: "Instant, hyper-personalized AI audit reports delivered the moment a prospect submits your form.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
