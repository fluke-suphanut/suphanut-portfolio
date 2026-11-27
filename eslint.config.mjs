import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // wrangler dev writes generated worker code here
    ".wrangler/**",
    // public build output and its temporary source copy (scripts/build-public.mjs)
    "out-public/**",
    ".public-build/**",
  ]),
]);

export default eslintConfig;
