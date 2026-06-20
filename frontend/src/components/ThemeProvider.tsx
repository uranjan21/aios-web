import { useUIStore } from '@/stores/uiStore'
import { ThemeProvider as LedgrProvider, GlobalStyles } from '@ledgr/ui'
import { createGlobalStyle } from 'styled-components'
import { aiosLightTheme, aiosDarkTheme } from '@/theme/aiosTheme'

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
  }
`

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore(s => s.theme)

  return (
    <LedgrProvider theme={theme === 'dark' ? aiosDarkTheme : aiosLightTheme}>
      <GlobalStyles />
      <ThemeVars />
      {children}
    </LedgrProvider>
  )
}
