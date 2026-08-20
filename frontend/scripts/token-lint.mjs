#!/usr/bin/env node
/**
 * token-lint — design-system drift ratchet.
 *
 * The 2026-07-21 audit found that ~85% of spacing, ~88% of font-size and ~39%
 * of radius declarations bypass the theme entirely, plus 34 references to CSS
 * variables that are never defined. Nothing in the toolchain noticed. This
 * script is that missing check.
 *
 * Modes:
 *   (default)   ratchet  — fails only when a violation count RISES above the
 *                          committed baseline. Lets the check land immediately
 *                          without first fixing ~1,500 sites.
 *   --update             — rewrite the baseline from current counts.
 *   --strict             — zero tolerance. Every count must be 0. This is the
 *                          mode to switch to at the end of the token rebuild.
 *   --report             — print offending file:line for every rule, then exit 0.
 *
 * Dependency-free by design: it must run before/without an install.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const BASELINE_PATH = join(ROOT, 'scripts', 'token-lint.baseline.json');

const SCAN_ROOTS = [
  'apps/shell/src',
  'apps/finance/src',
  'apps/health/src',
  'apps/career/src',
  'packages/shared/src',
  'packages/ui/src',
];

/** Theme-definition files are allowed to contain raw values — that is their job. */
const THEME_FILES = [
  'packages/ui/src/theme/tokens.ts',
  'packages/ui/src/theme/theme.ts',
  // Carries the package's standalone fallback palette.
  'packages/ui/src/theme/ThemeProvider.tsx',
  // Style recipes (visually-hidden clip values, focus offsets) are definitions.
  'packages/ui/src/theme/mixins.ts',
  'packages/shared/src/theme/ctTheme.ts',
  'packages/shared/src/theme/palettes.ts',
  'packages/shared/src/theme/layout.ts',
  // User-facing swatch palette — persisted colour DATA, not theme styling.
  'packages/shared/src/config/swatches.ts',
];

/**
 * Components whose round shape is structural, not a corner-rounding choice.
 * The project rule bans pills but explicitly exempts true circles.
 */
const CIRCLE_ALLOWLIST = [
  'packages/ui/src/primitives/Avatar/Avatar.tsx',
  'packages/ui/src/interactive/Switch/Switch.tsx',
  'packages/ui/src/patterns/Skeleton/Skeleton.tsx',
];

const isThemeFile = (rel) => THEME_FILES.includes(rel.split(sep).join('/'));
const isCircleAllowed = (rel) => CIRCLE_ALLOWLIST.includes(rel.split(sep).join('/'));

/* ── rules ────────────────────────────────────────────────────────────── */

/*
 * CSS variables that ARE defined, just not anywhere this script can see.
 *
 * `undefined-css-var` decides "defined" by scanning our source for `--x:`.
 * That is right for variables we declare, and wrong for ones a third-party
 * component writes onto the DOM node at runtime from its props — the
 * declaration exists in the library's JS, never as CSS text in this repo.
 *
 * Keep this list SHORT and justified. Every entry is a hole in a rule whose
 * whole value is catching typos in variable names, so an entry needs a reason
 * a reader can check, not just a name.
 */
const EXTERNAL_VARS = new Set([
  // Written inline by `react-loading-skeleton` from the baseColor /
  // highlightColor / duration props. See packages/ui/src/patterns/Skeleton.
  '--base-color',
  '--highlight-color',
  '--animation-duration',
]);

/*
 * Third-party BRAND colours. These are the one class of hex that must stay
 * literal: recolouring somebody else's trademark to fit our palette makes the
 * mark wrong, and in most brand guidelines it is not permitted.
 *
 * The rule exists to stop OUR colours drifting off the token scale, and it was
 * flagging the Google `G` — which no amount of theming should ever touch.
 */
const BRAND_HEXES = new Set([
  // Google "G" mark — apps/shell/src/pages/LoginPage.tsx (Continue with Google).
  '#4285F4', '#34A853', '#FBBC05', '#EA4335',
]);

const RULES = [
  {
    id: 'hardcoded-font-size',
    label: 'font-size in a raw unit — px/rem/em/clamp() (use theme.typography role tokens)',
    // `Npx` only, until 2026-08-17 — which made every rem/em/clamp() font-size
    // invisible to the gate (26 of them, concentrated in the marketing pages
    // and the onboarding wizard, i.e. exactly the surfaces nobody re-checks).
    // A raw `1.05rem` is the same drift as a raw `17px`.
    pattern: /font-size:\s*(?:\d+(?:\.\d+)?(?:px|rem|em)\b|clamp\()/g,
    skip: (rel) => isThemeFile(rel),
  },
  {
    id: 'hardcoded-font-weight',
    label: 'font-weight literal (use theme.typography.fontWeight.* / textRole)',
    // 218 raw against 30 tokenized when this rule was written. Matches the CSS
    // declaration and the inline style-object / chart-prop form, because the
    // numeric-literal habit lives in both.
    pattern:
      /(?:font-weight:\s*(?:\d{3}|bold|bolder|lighter|normal)\b|fontWeight:\s*(?:\d{3}\b|['"](?:\d{3}|bold|bolder|lighter|normal)['"]))/g,
    skip: (rel) => isThemeFile(rel),
  },
  {
    id: 'hardcoded-line-height',
    label: 'line-height literal (use theme.typography role tokens / textRole)',
    // ~55 raw values across 16 distinct numbers against 4 named steps. An
    // interpolated `line-height: ${...}` is tokenized and does not match.
    pattern: /line-height:\s*(?:\d+(?:\.\d+)?(?:px|rem|em)?|normal)\b/g,
    skip: (rel) => isThemeFile(rel),
  },
  {
    id: 'rgba-outside-shadow',
    label: 'rgba()/rgb() literal outside box-shadow (use theme.color.* or color-mix)',
    // The sibling `rgba-in-shadow` rule covers box-shadow only, so ~150 raw
    // rgba() backgrounds, borders and gradient stops were unseen. Anything
    // already charged to `rgba-in-shadow` is skipped here — one violation is
    // never counted twice, or both numbers stop meaning anything.
    pattern: /rgba?\(/g,
    skip: (rel, m) =>
      isThemeFile(rel) ||
      // Bounded 200-char lookback: is this inside a box-shadow declaration?
      /(?:box-shadow|boxShadow)[^;{}\n]*$/.test(m.input.slice(Math.max(0, m.index - 200), m.index)),
  },
  {
    id: 'hex-alpha-concat',
    label: "hex-alpha string concat (theme.color.x + '30' / ${theme.color.x}40) — use color-mix()",
    // This is not style drift, it is a latent bug: it assumes every palette
    // value is a 6-digit hex. `packages/shared/src/theme/palettes.ts` ALREADY
    // ships `rgba(...)` overlay tokens, and any future 3-digit hex, `rgb()` or
    // `oklch()` value turns these into silently invalid CSS that the browser
    // drops — no error, just a missing colour.
    pattern:
      /(?:\$\{[^}\n]{0,160}(?:color|palette|accent)[^}\n]{0,160}\}[0-9a-f]{2}(?![0-9a-f])|(?:color|palette|accent)[a-z0-9_.$[\]'"]{0,80}\s*\+\s*['"`][0-9a-f]{2}['"`])/gi,
    skip: (rel) => isThemeFile(rel),
  },
  {
    id: 'hardcoded-radius',
    label: 'border-radius in raw px (use theme.radii.*)',
    pattern: /border-radius:\s*(\d+(?:\.\d+)?)px/g,
    skip: (rel, m) => /9{3,4}px/.test(m[0]) && isCircleAllowed(rel),
  },
  {
    id: 'pill-radius',
    label: 'pill radius 999px/9999px — banned outside true circles',
    pattern: /border-radius:\s*9{3,4}px/g,
    skip: (rel) => isCircleAllowed(rel),
  },
  {
    id: 'hardcoded-hex',
    label: 'hex color literal outside theme files',
    pattern: /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g,
    skip: (rel, m) => isThemeFile(rel) || BRAND_HEXES.has(m[0].toUpperCase()),
  },
  {
    id: 'hardcoded-spacing',
    label: 'padding/margin/gap in raw px (use theme.spacing / layout.spacing)',
    // Only CSS declarations inside styled-components. A quoted value is an
    // inline style object (`style={{ padding: '16px' }}`) and belongs to the
    // inline-style-object rule — counting it here double-charged the same
    // violation to two categories and made both numbers meaningless.
    pattern:
      /(?:padding|margin|gap|row-gap|column-gap)(?:-(?:top|right|bottom|left))?:\s*(?!['"])[^;\n'"]*?\d+px/g,
    skip: (rel) => isThemeFile(rel),
  },
  {
    id: 'rgba-in-shadow',
    label: 'rgba() literal in box-shadow (use theme.elevation.*)',
    // `boxShadow:` too — the inline style-object form is the same violation,
    // and leaving it out would have let `rgba-outside-shadow` skip it as
    // "already charged to the shadow rule" when nothing was charging it.
    pattern: /(?:box-shadow|boxShadow):[^;\n]*rgba\(/g,
    skip: (rel) => isThemeFile(rel),
  },
  {
    id: 'hardcoded-font-family',
    label: 'font-family literal (use theme.typography.fontFamily.*)',
    pattern: /font-family:\s*['"]/g,
    skip: (rel) => isThemeFile(rel),
  },
  {
    id: 'adhoc-breakpoint',
    label: '@media with a raw px breakpoint (use theme.breakpoint.*)',
    pattern: /@media[^{\n]*\(\s*(?:min|max)-width:\s*\d+px/g,
  },
  {
    id: 'inline-style-static-value',
    label: "inline style={{ }} with a STATIC visual value (move to styled-components)",
    // Was `style={{` — which flagged every inline style including the many
    // that carry genuinely computed values (transforms, measured heights,
    // progress widths). Those are correct usage and unfixable by definition,
    // so a count including them could never reach zero and told you nothing.
    // This matches only literal spacing/size/colour values, which are the ones
    // that actually belong in a styled-component reading the theme.
    pattern:
      /style=\{\{[^}]*?(?:padding|margin|gap|fontSize|borderRadius|width|height)\s*:\s*['"]\d+px['"]/g,
  },
];

/* ── file walk ────────────────────────────────────────────────────────── */

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'dist' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry) && !/\.d\.ts$/.test(entry)) out.push(full);
  }
  return out;
}

const files = SCAN_ROOTS.flatMap((r) => walk(join(ROOT, r)));

/* ── scan ─────────────────────────────────────────────────────────────── */

const counts = Object.fromEntries(RULES.map((r) => [r.id, 0]));
const hits = Object.fromEntries(RULES.map((r) => [r.id, []]));

/** CSS custom properties: definitions vs references, to catch phantom vars. */
const definedVars = new Set();
const referencedVars = new Map(); // name -> [file:line]

for (const file of files) {
  const rel = relative(ROOT, file);
  const src = readFileSync(file, 'utf8');
  const lineAt = (idx) => src.slice(0, idx).split('\n').length;

  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    let m;
    while ((m = rule.pattern.exec(src)) !== null) {
      if (rule.skip?.(rel, m)) continue;
      counts[rule.id]++;
      if (hits[rule.id].length < 400) {
        hits[rule.id].push(`${rel}:${lineAt(m.index)}  ${m[0].trim().slice(0, 80)}`);
      }
    }
  }

  for (const m of src.matchAll(/(--[a-z0-9][a-z0-9-]*)\s*:/gi)) definedVars.add(m[1]);
  for (const m of src.matchAll(/var\(\s*(--[a-z0-9][a-z0-9-]*)/gi)) {
    if (!referencedVars.has(m[1])) referencedVars.set(m[1], []);
    referencedVars.get(m[1]).push(`${rel}:${lineAt(m.index)}`);
  }
}

const undefinedVarHits = [];
for (const [name, locations] of referencedVars) {
  if (!definedVars.has(name) && !EXTERNAL_VARS.has(name)) {
    for (const loc of locations) undefinedVarHits.push(`${loc}  var(${name})`);
  }
}
counts['undefined-css-var'] = undefinedVarHits.length;
hits['undefined-css-var'] = undefinedVarHits;
const ALL_RULES = [
  ...RULES,
  { id: 'undefined-css-var', label: 'var(--x) referencing a variable never defined anywhere' },
];

/* ── modes ────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const mode = argv.includes('--update')
  ? 'update'
  : argv.includes('--strict')
    ? 'strict'
    : argv.includes('--report')
      ? 'report'
      : 'ratchet';

const pad = (s, n) => String(s).padEnd(n);
const total = Object.values(counts).reduce((a, b) => a + b, 0);

if (mode === 'report') {
  for (const rule of ALL_RULES) {
    if (!counts[rule.id]) continue;
    console.log(`\n\x1b[1m${rule.id}\x1b[0m (${counts[rule.id]}) — ${rule.label}`);
    for (const h of hits[rule.id].slice(0, 40)) console.log(`  ${h}`);
    if (hits[rule.id].length > 40) console.log(`  … ${counts[rule.id] - 40} more`);
  }
  console.log(`\nTotal: ${total} across ${files.length} files.`);
  process.exit(0);
}

if (mode === 'update') {
  writeFileSync(
    BASELINE_PATH,
    JSON.stringify({ generated: new Date().toISOString().slice(0, 10), counts }, null, 2) + '\n',
  );
  console.log(`Baseline written to scripts/token-lint.baseline.json (${total} total).`);
  for (const rule of ALL_RULES) console.log(`  ${pad(rule.id, 24)} ${counts[rule.id]}`);
  process.exit(0);
}

if (mode === 'strict') {
  const failing = ALL_RULES.filter((r) => counts[r.id] > 0);
  for (const rule of ALL_RULES) {
    const n = counts[rule.id];
    console.log(`  ${n === 0 ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${pad(rule.id, 24)} ${n}`);
  }
  if (failing.length) {
    console.error(`\ntoken-lint --strict: ${total} violations remain. Run --report for locations.`);
    process.exit(1);
  }
  console.log('\ntoken-lint --strict: clean.');
  process.exit(0);
}

/* ratchet */
if (!existsSync(BASELINE_PATH)) {
  console.error('No baseline found. Run: node scripts/token-lint.mjs --update');
  process.exit(1);
}
const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).counts;
let regressed = false;
let improved = 0;

for (const rule of ALL_RULES) {
  const now = counts[rule.id];
  const was = baseline[rule.id] ?? 0;
  const delta = now - was;
  if (delta > 0) {
    regressed = true;
    console.error(`  \x1b[31m✗\x1b[0m ${pad(rule.id, 24)} ${was} → ${now}  (+${delta})`);
  } else if (delta < 0) {
    improved += -delta;
    console.log(`  \x1b[32m↓\x1b[0m ${pad(rule.id, 24)} ${was} → ${now}  (${delta})`);
  } else {
    console.log(`  \x1b[90m=\x1b[0m ${pad(rule.id, 24)} ${now}`);
  }
}

if (regressed) {
  console.error(
    '\ntoken-lint: new design-system violations introduced. Use theme tokens, or run --update if the baseline is genuinely moving.',
  );
  process.exit(1);
}
console.log(
  improved > 0
    ? `\ntoken-lint: no regressions, ${improved} violations removed. Run --update to lock in the gain.`
    : '\ntoken-lint: no regressions.',
);
