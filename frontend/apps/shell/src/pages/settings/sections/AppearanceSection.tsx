import { Sun, Moon } from 'lucide-react'
import { Button, focusRing } from '@ledgr/ui'
import styled from 'styled-components'
import { useUIStore } from '@ct/shared/stores/uiStore'
import { PALETTES } from '@ct/shared/theme/palettes'
import { Row, Section } from '../shared'

// ── Theme toggle ──────────────────────────────────────────────────────────────

const ThemeSwitcher = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  background: ${({ theme }) => theme.color.muted};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: ${({ theme }) => `${theme.spacing[1]}`};
`

const ThemeBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  padding: ${({ theme }) => `${theme.spacing[1.5]} ${theme.spacing[2.5]}`};
  border-radius: ${({ theme }) => theme.radii.xs};
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
  ${focusRing}
`

// ── Palette picker ────────────────────────────────────────────────────────────

const PaletteLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  padding: ${({ theme }) => `${theme.spacing[3.5]} ${theme.spacing[5]} 0`};
`

const PaletteGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[5]} ${theme.spacing[4]}`};
`

const PaletteBtn = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  padding: ${({ theme }) => `${theme.spacing[2.5]} ${theme.spacing[1.5]}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme, $active }) => $active ? theme.color.accent : theme.color.border};
  background: ${({ theme, $active }) => $active ? theme.color.muted : 'transparent'};
  cursor: pointer;
  transition: all 120ms;
  &:hover { border-color: ${({ theme }) => theme.color.accent}; }
  ${focusRing}
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
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
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
