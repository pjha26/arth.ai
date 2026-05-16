import type { Metadata } from "next";
import { Inter, DM_Serif_Display } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "arth.ai — AI-Powered Inbound Personalization Platform",
  description:
    "The moment a prospect submits your form, arth.ai researches their company, generates a personalized AI audit, and delivers it to their inbox — before any human gets involved.",
  keywords: [
    "AI personalization",
    "inbound automation",
    "lead intelligence",
    "AI audit report",
    "B2B automation",
  ],
  openGraph: {
    title: "arth.ai — AI-Powered Inbound Personalization",
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
    <html lang="en" className={`${inter.variable} ${dmSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
