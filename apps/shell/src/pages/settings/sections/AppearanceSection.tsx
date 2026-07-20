import { Sun, Moon } from 'lucide-react'
import { Button } from '@ledgr/ui'
import styled from 'styled-components'
import { useUIStore } from '@aios/shared/stores/uiStore'
import { PALETTES } from '@aios/shared/theme/palettes'
import { Row, Section } from '../shared'

// ── Theme toggle ──────────────────────────────────────────────────────────────

const ThemeSwitcher = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  background: ${({ theme }) => theme.color.muted};
  border-radius: 8px;
  padding: 4px;
`

const ThemeBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 120ms;
  ${({ theme, $active }) => $active ? `
    background: ${theme.color.card};
    color: ${theme.color.foreground};
    border-color: ${theme.color.border}80;
    box-shadow: ${theme.shadow.xs};
  ` : `
    background: transparent;
    color: ${theme.color.mutedForeground};
    &:hover { color: ${theme.color.foreground}; }
  `}
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 2px; }
`

// ── Palette picker ────────────────────────────────────────────────────────────

const PaletteLabel = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  padding: 14px 20px 0;
`

const PaletteGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 10px;
  padding: 4px 20px 16px;
`

const PaletteBtn = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 10px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme, $active }) => $active ? theme.color.accent : theme.color.border};
  background: ${({ theme, $active }) => $active ? theme.color.muted : 'transparent'};
  cursor: pointer;
  transition: all 120ms;
  &:hover { border-color: ${({ theme }) => theme.color.accent}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 2px; }
`

const SwatchStack = styled.div`
  display: flex;
  border-radius: ${({ theme }) => theme.radii.sm};
  overflow: hidden;
  width: 100%;
  height: 28px;
  box-shadow: ${({ theme }) => theme.shadow.xs};
`

const SwatchChip = styled.div<{ $color: string }>`
  flex: 1;
  background: ${({ $color }) => $color};
`

const PaletteName = styled.span<{ $active: boolean }>`
  font-size: 11px;
  font-weight: ${({ $active }) => $active ? 600 : 500};
  color: ${({ theme, $active }) => $active ? theme.color.foreground : theme.color.mutedForeground};
  text-align: center;
`

function PalettePicker() {
  const { palette, setPalette } = useUIStore()
  return (
    <PaletteGrid>
      {PALETTES.map(p => (
        <PaletteBtn
          key={p.id}
          type="button"
          $active={palette === p.id}
          aria-pressed={palette === p.id}
          aria-label={`${p.label} palette`}
          onClick={() => setPalette(p.id)}
        >
          <SwatchStack>
            {p.swatch.map((c, i) => <SwatchChip key={i} $color={c} />)}
          </SwatchStack>
          <PaletteName $active={palette === p.id}>{p.label}</PaletteName>
        </PaletteBtn>
      ))}
    </PaletteGrid>
  )
}

// ── Appearance section ────────────────────────────────────────────────────────

export function AppearanceSection() {
  const { theme, setTheme, setPalette } = useUIStore()
  return (
    <Section
      title="Appearance"
      action={
        <Button size="sm" variant="ghost" onClick={() => { setTheme('light'); setPalette('monochrome') }}>
          Reset
        </Button>
      }
    >
      <Row label="Theme">
        <ThemeSwitcher>
          <ThemeBtn onClick={() => setTheme('dark')} aria-pressed={theme === 'dark'} aria-label="Dark mode" $active={theme === 'dark'}>
            <Moon size={14} /> Dark
          </ThemeBtn>
          <ThemeBtn onClick={() => setTheme('light')} aria-pressed={theme === 'light'} aria-label="Light mode" $active={theme === 'light'}>
            <Sun size={14} /> Light
          </ThemeBtn>
        </ThemeSwitcher>
      </Row>
      <PaletteLabel>Color palette</PaletteLabel>
      <PalettePicker />
    </Section>
  )
}
