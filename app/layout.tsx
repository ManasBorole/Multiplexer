import type { Metadata, Viewport } from "next";
import { Archivo, Schibsted_Grotesk, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const sans = Schibsted_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

// Headings only: Archivo set slightly wide reads engineered, not friendly.
const display = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["wdth"],
});

const mono = Spline_Sans_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

const DESCRIPTION =
  "Multiplexer picks the best LLM for every prompt by weighing quality, cost and speed, learns from each answer, and shows every routing decision.";

export const metadata: Metadata = {
  metadataBase: new URL("https://multiplexer-routes.vercel.app"),
  title: "Multiplexer: a learned LLM routing gateway",
  description: DESCRIPTION,
  openGraph: {
    title: "Multiplexer: a learned LLM routing gateway",
    description:
      "Type a prompt and watch it get routed: cache check, model scores, failover, judge and learning, step by step.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d1015",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
