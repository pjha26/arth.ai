import type { Metadata } from "next";
import { Inter, Syne } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "arth.ai — AI-Powered Inbound Personalization Platform",
  description:
    "Most tools enrich outbound lists. arth.ai delivers hyper-personalized intelligence the moment a prospect reaches out — before any human gets involved.",
  keywords: [
    "AI personalization",
    "inbound automation",
    "lead intelligence",
    "AI audit report",
    "B2B automation",
  ],
  openGraph: {
    title: "arth.ai — AI-Powered Inbound Personalization Platform",
    description:
      "Instant, hyper-personalized AI audit reports delivered the moment a prospect submits your form.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${syne.variable}`}>
      <body>{children}</body>
    </html>
  );
}
