import type { Config } from "tailwindcss";

/**
 * Warm premium dark - soft deep plum-charcoal, coral/rose glow accents, mint for
 * savings. Rounded cards, soft warm shadows, generous space. Pleasant, not techy.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#141019",
        "bg-2": "#181320",
        surface: "#1E1727",
        "surface-2": "#261E32",
        "surface-3": "#30273D",
        border: "#352B44",
        "border-soft": "#2A2235",
        // text - tinted warm, never flat gray
        ink: "#F6F0FA",
        "ink-2": "#C3B7D2",
        "ink-3": "#948AA6",
        "ink-4": "#6E6483",
        // accents
        coral: "#FF7A6B",
        rose: "#FF6E9C",
        mint: "#3FE0A0",
        amber: "#FFC24B",
        sky: "#5CC8FF",
        violet: "#A78BFA",
        danger: "#FF5C6A",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightish: "-0.02em",
        tighter2: "-0.035em",
      },
      borderRadius: {
        xl2: "24px",
        card: "18px",
        soft: "12px",
        pill: "999px",
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.045) inset, 0 24px 60px -30px rgba(0,0,0,0.75)",
        lift: "0 1px 0 rgba(255,255,255,0.06) inset, 0 32px 70px -28px rgba(0,0,0,0.85)",
        "glow-coral": "0 0 50px -12px rgba(255,122,107,0.45)",
        "glow-mint": "0 0 44px -14px rgba(63,224,160,0.4)",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "0.9" },
        },
        drift: {
          "0%, 100%": { transform: "translate(0,0)" },
          "50%": { transform: "translate(3%, -4%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "glow-pulse": "glow-pulse 5s ease-in-out infinite",
        drift: "drift 18s ease-in-out infinite",
        shimmer: "shimmer 2.2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
