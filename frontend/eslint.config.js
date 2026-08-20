// Flat config (ESLint 9). Installed 2026-08-16 — audit item F3.
//
// Scope: this is a CORRECTNESS + a11y gate, not a formatter. No stylistic or
// formatting rules are enabled on purpose — the repo has no Prettier gate and
// formatting churn would fight `token-lint` and every open branch.
//
// Ratchet policy:
//   error  = build-breaking. Only genuine correctness rules live here.
//   warn   = tracked drift (`no-explicit-any`, `exhaustive-deps`, a11y). CI caps
//            the warning count via `--max-warnings`, so the number may fall but
//            never rise. Lower the cap in .github/workflows/ci.yml after a
//            genuine reduction.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.vite/**',
      '**/coverage/**',
      'packages/ui/dist/**',
      'scripts/**',
      '**/*.config.js',
      '**/*.config.ts',
      '**/*.config.mjs',
      '**/*.d.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,

  // jsx-a11y recommended ships every rule at `error`. There are 32 pre-existing
  // hits (31 × no-autofocus, 1 × no-static-element-interactions), so leaving it
  // at error would make the gate red on day one and it could never be turned on.
  // Demoted to `warn` = counted by the --max-warnings ratchet, so the number can
  // fall but never rise. Promote back to error once the count reaches 0.
  {
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    rules: Object.fromEntries(
      Object.keys(jsxA11y.flatConfigs.recommended.rules).map((r) => [r, 'warn']),
    ),
  },

  // Service worker — not part of the app graph, has its own globals.
  {
    files: ['apps/*/public/**/*.js'],
    languageOptions: {
      globals: { ...globals.serviceworker, ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },

  {
    files: ['apps/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    settings: {
      react: { version: '18.3' },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // --- correctness: these are ERRORS and fail the build ---
      'react-hooks/rules-of-hooks': 'error',

      // --- tracked drift: warnings, capped by --max-warnings in CI ---
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'react-refresh/only-export-components': 'off',

      // `cond ? a() : b()` as a statement is used deliberately in the codebase
      // (PricingPage.tsx:288). Allow it; a bare `foo.bar;` stays an error.
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowTernary: true, allowShortCircuit: true },
      ],

      // tsc owns these; the base rules produce false positives on TS syntax.
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-redeclare': 'off',
    },
  },

  // ── KNOWN-BAD ALLOWLIST — shrink this, never grow it ──────────────────────
  // (Empty, and worth keeping that way. The one entry that lived here was
  // `PopoverTrigger`, which early-returned on a non-element child BEFORE two
  // `useCallback` calls — the hook count changed between renders, so React
  // threw "Rendered fewer hooks than expected" for any consumer passing a
  // string/array/null child. A real latent bug, surfaced the moment this gate
  // was first switched on and fixed the same day, 2026-08-17. `rules-of-hooks`
  // is now a build-breaking ERROR everywhere with no exceptions.)

  // Tests + vitest setup run in a node-ish environment.
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
    },
  },
);
