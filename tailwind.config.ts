import type { Config } from "tailwindcss";

/**
 * Tokens live as CSS variables in app/globals.css; this maps them for utility
 * classes so components never carry raw hex values.
 */
const v = (name: string) => `var(--${name})`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        "bg-2": v("bg-2"),
        card: v("card"),
        "card-2": v("card-2"),
        inset: v("inset"),
        line: v("line"),
        "line-2": v("line-2"),
        ink: v("ink"),
        dim: v("dim"),
        mute: v("mute"),
        acc: v("acc"),
        good: v("good"),
        warn: v("warn"),
        bad: v("bad"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
