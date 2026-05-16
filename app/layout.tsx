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
      <body>{children}</body>
    </html>
  );
}
