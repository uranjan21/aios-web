import { useUIStore } from '@ct/shared/stores/uiStore'
import { ThemeProvider as LedgrProvider, GlobalStyles } from '@ledgr/ui'
import { createGlobalStyle } from 'styled-components'
import { getTheme } from '@ct/shared/theme/ctTheme'

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

    /* Expressive layers */
    --gradient-accent: ${({ theme }) => theme.gradient.accent};
    --gradient-hairline: ${({ theme }) => theme.gradient.hairline};
    --glass-bg: ${({ theme }) => theme.glass.background};
    --glass-border: ${({ theme }) => theme.glass.border};
    --focus-ring: ${({ theme }) => theme.focusRing};

    /*
     * Aliases for variables that components referenced but nothing ever
     * defined. The 2026-07-21 audit found 36 such references — InboxTab was
     * styled almost entirely against a phantom --ui-* set with no fallbacks,
     * so its text colours resolved to inherit and its surfaces to nothing.
     * Defining them here makes those components render correctly
     * today; they still owe a migration onto theme tokens directly.
     */
    --ui-text-primary: ${({ theme }) => theme.color.foreground};
    --ui-text-secondary: ${({ theme }) => theme.color.mutedForeground};
    --ui-text-tertiary: ${({ theme }) => theme.color.mutedForeground};
    --ui-bg-base: ${({ theme }) => theme.color.card};
    --ui-bg-subtle: ${({ theme }) => theme.color.muted};
    --ui-border: ${({ theme }) => theme.color.border};
    --ui-primary: ${({ theme }) => theme.color.primary};
    --ui-primary-subtle: ${({ theme }) => theme.color.muted};
    --ui-danger: ${({ theme }) => theme.color.destructive};
    --ui-danger-subtle: ${({ theme }) => 'color-mix(in srgb, ' + theme.color.destructive + ' 12%, transparent)'};
    --ui-success: ${({ theme }) => theme.color.success};
    --ui-success-subtle: ${({ theme }) => 'color-mix(in srgb, ' + theme.color.success + ' 12%, transparent)'};
    --ui-shadow-sm: ${({ theme }) => theme.elevation[1]};
    --ui-shadow-md: ${({ theme }) => theme.elevation[2]};

    --color-surface: ${({ theme }) => theme.color.background};
    --color-surface-raised: ${({ theme }) => theme.color.card};
    --color-text: ${({ theme }) => theme.color.foreground};
    --color-border: ${({ theme }) => theme.color.border};
    --color-warning: ${({ theme }) => theme.color.warning};

    /* Domain identity — constant across palettes, flips with light/dark */
    --domain-finance: ${({ theme }) => theme.domain.finance};
    --domain-health: ${({ theme }) => theme.domain.health};
    --domain-career: ${({ theme }) => theme.domain.career};
    --domain-vault: ${({ theme }) => theme.domain.vault};
    --domain-general: ${({ theme }) => theme.domain.general};
    /* Retired areas: rows tagged with these still need a colour. */
    --domain-business: ${({ theme }) => theme.domain.business};
    --domain-content: ${({ theme }) => theme.domain.content};
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
