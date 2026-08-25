import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // e2e distDir propio (run-e2e.sh usa NEXT_DIST_DIR=".next-e2e")
    ".next-e2e/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    // E2E tests — linted by @playwright/test's own config
    "e2e/**",
    "playwright.config.ts",
    // Test fixtures
    "public/test-fixtures/**",
  ]),
  // Hardcode React version so eslint-plugin-react doesn't try to detect it
  // via context.getFilename(), which crashes on ESLint 10 flat config.
  { settings: { react: { version: "19.0" } } },
  // React 19 lint rules are overly strict for well‑established patterns
  // (initialisation from env / localStorage / URL params, fetch‑on‑mount,
  // reset‑on‑navigation). Keep them as warnings so CI stays green while
  // the team can still see them in the editor.
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  // SonarJS (code smells) — subset curado de reglas de alto valor, todas como
  // warnings para que CI siga verde y los smells queden visibles en el editor.
  // El recommended completo (279 reglas) tira ~2900 warnings de ruido
  // estilístico (arrow-function-convention, file-header, no-implicit-dependencies…)
  // — se dejan desactivadas. Ver docs/QA.md.
  {
    plugins: { sonarjs },
    rules: {
      // Complejidad
      "sonarjs/cognitive-complexity": "warn",
      "sonarjs/cyclomatic-complexity": "warn",
      "sonarjs/expression-complexity": "warn",
      "sonarjs/nested-control-flow": "warn",
      // Duplicación / lógica repetida
      "sonarjs/no-duplicate-string": "warn",
      "sonarjs/no-identical-functions": "warn",
      "sonarjs/no-identical-conditions": "warn",
      "sonarjs/no-identical-expressions": "warn",
      "sonarjs/no-duplicated-branches": "warn",
      "sonarjs/no-all-duplicated-branches": "warn",
      // Bugs / dead code
      "sonarjs/no-dead-store": "warn",
      "sonarjs/no-inconsistent-returns": "warn",
      "sonarjs/no-reference-error": "warn",
      "sonarjs/no-useless-catch": "warn",
      "sonarjs/no-ignored-return": "warn",
      "sonarjs/no-extra-arguments": "warn",
      "sonarjs/no-redundant-boolean": "warn",
      "sonarjs/no-redundant-jump": "warn",
      "sonarjs/no-inverted-boolean-check": "warn",
      "sonarjs/no-misleading-array-reverse": "warn",
      "sonarjs/no-element-overwrite": "warn",
      "sonarjs/no-unused-collection": "warn",
      "sonarjs/no-empty-collection": "warn",
      "sonarjs/no-collection-size-mischeck": "warn",
      "sonarjs/no-array-delete": "warn",
      "sonarjs/no-small-switch": "warn",
      "sonarjs/prefer-immediate-return": "warn",
      "sonarjs/no-unenclosed-multiline-block": "warn",
      // Seguridad
      "sonarjs/no-hardcoded-ip": "warn",
      "sonarjs/no-hardcoded-passwords": "warn",
      "sonarjs/super-linear-regex": "warn",
      // Higiene
      "sonarjs/no-commented-code": "warn",
      "sonarjs/todo-tag": "warn",
    },
  },
]);

export default eslintConfig;
