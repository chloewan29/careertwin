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
  ]),
  {
    files: [
      "app/**/*.tsx", 
      "components/web/**/*.tsx", 
      "components/web/**/*.ts"
    ],
    ignores: [
      "app/api/**/*"
    ],
    rules: {
      "no-restricted-imports": ["error", {
        "paths": [
          {
            "name": "@/lib/db/supabase/client",
            "message": "UI components must not import Supabase directly. Use adapters and web-contracts instead."
          },
          {
            "name": "@/lib/db/supabase/server",
            "message": "UI components must not import Supabase directly. Use adapters and web-contracts instead."
          }
        ],
        "patterns": [
          {
            "group": ["@/lib/career-engine/*"],
            "message": "UI components must not import Career Engine internals. Use adapters and web-contracts instead."
          },
          {
            "group": ["@/supabase/*"],
            "message": "UI components must not import backend schema details. Use adapters and web-contracts instead."
          }
        ]
      }]
    }
  }
]);

export default eslintConfig;
