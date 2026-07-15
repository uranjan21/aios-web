import { useUIStore } from '@/stores/uiStore'
import { ThemeProvider as LedgrProvider, GlobalStyles } from '@ledgr/ui'
import { createGlobalStyle } from 'styled-components'
import { getTheme } from '@/theme/aiosTheme'

/** "#1C1917" → "28, 25, 23" (for rgba(var(--primary-rgb), a) usages) */
function hexToRgbChannels(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return '28, 25, 23'
  const n = parseInt(m[1], 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

/**
 * Bridges the styled-components theme into CSS custom properties so that every
 * `var(--*)` used across the app resolves to the active (light/dark) theme.
 * Without this, all `var(--*)` references are undefined. createGlobalStyle
 * reads `theme` from the surrounding LedgrProvider, so these react to theme
 * changes automatically.
 */
const ThemeVars = createGlobalStyle`
  :root {
    /* Surfaces */
    --background: ${({ theme }) => theme.color.background};
    --foreground: ${({ theme }) => theme.color.foreground};
    --card: ${({ theme }) => theme.color.card};
    --card-foreground: ${({ theme }) => theme.color.cardForeground};
    --popover: ${({ theme }) => theme.color.popover};
    --popover-foreground: ${({ theme }) => theme.color.popoverForeground};
    --muted: ${({ theme }) => theme.color.muted};
    --muted-foreground: ${({ theme }) => theme.color.mutedForeground};

    /* Brand */
    --primary: ${({ theme }) => theme.color.primary};
    --primary-foreground: ${({ theme }) => theme.color.primaryForeground};
    --primary-rgb: ${({ theme }) => hexToRgbChannels(theme.color.primary)};
    --accent: ${({ theme }) => theme.color.accent};
    --accent-foreground: ${({ theme }) => theme.color.accentForeground};

    /* States */
    --destructive: ${({ theme }) => theme.color.destructive};
    --success: ${({ theme }) => theme.color.success};
    --warning: ${({ theme }) => theme.color.warning};
    --info: ${({ theme }) => theme.color.info};

    /* Lines + focus */
    --border: ${({ theme }) => theme.color.border};
    --input: ${({ theme }) => theme.color.input};
    --ring: ${({ theme }) => theme.color.ring};
    --overlay: ${({ theme }) => theme.color.overlay};

    /* Page background alias */
    --page-bg: ${({ theme }) => theme.color.background};

    /* Semantic KPI palette (emerald/red/amber → success/destructive/warning) */
    --kpi-emerald: ${({ theme }) => theme.color.success};
    --kpi-red: ${({ theme }) => theme.color.destructive};
    --kpi-amber: ${({ theme }) => theme.color.warning};

    /* camelCase aliases used with fallbacks in a few inline styles */
    --color-card: ${({ theme }) => theme.color.card};
    --color-cardForeground: ${({ theme }) => theme.color.cardForeground};
    --color-primary: ${({ theme }) => theme.color.primary};
    --color-accent: ${({ theme }) => theme.color.accent};
    --color-muted: ${({ theme }) => theme.color.muted};

    /* Shadow alias */
    --shadow-premium-sm: ${({ theme }) => theme.shadow.sm};

    /* HUD layer — derived per palette+mode in aiosTheme.buildHud() */
    --hud-hairline: ${({ theme }) => theme.hud.hairline};
    --hud-hairline-v: ${({ theme }) => theme.hud.hairlineV};
    --hud-corner-tick: ${({ theme }) => theme.hud.cornerTick};
    --hud-node-glow: ${({ theme }) => theme.hud.nodeGlow};
    --hud-grid-dot: ${({ theme }) => theme.hud.gridDot};
    --hud-grid-pitch: ${({ theme }) => theme.hud.gridPitch};
    --hud-glass: ${({ theme }) => theme.hud.glass};
    --hud-glass-border: ${({ theme }) => theme.hud.glassBorder};
    --hud-glass-blur: ${({ theme }) => theme.hud.glassBlur};
    --hud-focus-ring: ${({ theme }) => theme.hud.focusRing};
    --hud-accent-grad: ${({ theme }) => theme.hud.accentGrad};
    --hud-accent-grad-fg: ${({ theme }) => theme.hud.accentGradFg};

    /* Domain identity — constant across palettes, flips with light/dark */
    --domain-finance: ${({ theme }) => theme.domain.finance};
    --domain-health: ${({ theme }) => theme.domain.health};
    --domain-career: ${({ theme }) => theme.domain.career};
    --domain-business: ${({ theme }) => theme.domain.business};
    --domain-content: ${({ theme }) => theme.domain.content};
    --domain-vault: ${({ theme }) => theme.domain.vault};
    --domain-general: ${({ theme }) => theme.domain.general};
  }

  /*
   * @ledgr/ui GlobalStyles sets h1-h6 to theme.typography.fontFamily.serif,
   * which is correct for Ledgr (Fraunces headings) but violates the AIOS rule
   * that UI is never serif. ThemeVars renders after GlobalStyles, so this wins
   * at equal specificity — while any call site that sets font-family
   * explicitly (Sidebar brand, Pricing/Landing display, KPI numerals) still
   * wins over it on specificity and keeps Playfair deliberately.
   */
  h1, h2, h3, h4, h5, h6 {
    font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  }
`

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore(s => s.theme)
  const palette = useUIStore(s => s.palette)

  return (
    <LedgrProvider theme={getTheme(palette, theme)}>
      <GlobalStyles />
      <ThemeVars />
      {children}
    </LedgrProvider>
  )
}
