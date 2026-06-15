import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        surface: {
          dim: 'hsl(var(--surface-dim))',
          DEFAULT: 'hsl(var(--background))',
          bright: 'hsl(var(--background))',
          'container-lowest': 'hsl(var(--surface-container-lowest))',
          'container-low': 'hsl(var(--surface-container-low))',
          container: 'hsl(var(--surface-container))',
          'container-high': 'hsl(var(--surface-container-high))',
          'container-highest': 'hsl(var(--surface-container-highest))',
        },
        'on-surface': 'hsl(var(--foreground))',
        'on-surface-variant': 'hsl(var(--on-surface-variant))',
        outline: {
          DEFAULT: 'hsl(var(--outline))',
          variant: 'hsl(var(--outline-variant))',
        },
        kpi: {
          emerald: 'hsl(var(--kpi-emerald))',
          blue: 'hsl(var(--kpi-blue))',
          purple: 'hsl(var(--kpi-purple))',
          red: 'hsl(var(--kpi-red))',
          amber: 'hsl(var(--kpi-amber))',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 6px)',
        '2xl': 'calc(var(--radius) + 10px)',
        '3xl': 'calc(var(--radius) + 16px)',
      },
    },
  },
  plugins: [],
} satisfies Config
