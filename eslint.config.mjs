import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// `next lint` was removed in Next 16; lint runs through the ESLint CLI.
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Skip build output and all hidden tool folders.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".*/**"]),
]);
