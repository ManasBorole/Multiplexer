import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const sans = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://multiplexer.dev"),
  title: "Multiplexer - Intelligent LLM Routing Gateway",
  description:
    "Routes every request to the optimal AI model based on cost, latency and quality. Watch the whole routing lifecycle - model choice, cost saved, latency, cache, and a bandit that learns.",
  openGraph: {
    title: "Multiplexer - Intelligent LLM Routing Gateway",
    description:
      "Type a prompt, watch it get routed. Model choice, cost saved, latency, cache, failover, and a learning bandit - all visible.",
    type: "website",
  },
};

const DIRECTION_CONTRACT = `<!--
  MULTIPLEXER · DIRECTION CONTRACT (Warm Product Story)
  THESIS: An LLM routing gateway told as a warm, animated product story - a
    visitor grasps in 30s what it is, what to do, and what happens behind the
    scenes. Refuses the dense techy dashboard and the blank "enter prompt" clone.
  OWN-WORLD: Soft deep plum-charcoal with coral/rose glow pools; rounded lifted
    cards; Bricolage Grotesque display + Hanken Grotesk body + JetBrains Mono
    figures; mint for savings; fluid Framer Motion. No hard grids, no gradient text.
  STORY: Hero + Try Demo, type a prompt, a 7-step pipeline animation, the chat
    answer, then the routing decision (model, confidence, why, alternatives), cost
    saved, latency, cache, provider timeline, live metrics, the bandit learning,
    history, and a provider-failure demo.
  FIRST VIEWPORT: Centered MULTIPLEXER wordmark + one-line tagline over a soft
    glow, a clear prompt box, and a Try Demo call to action.
  FORM: Animated product narrative / explainer dashboard.
  FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <div hidden dangerouslySetInnerHTML={{ __html: DIRECTION_CONTRACT }} />
        {children}
      </body>
    </html>
  );
}
