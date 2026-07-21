import { useState, useRef, useEffect } from 'react'
import styled, { useTheme } from 'styled-components'
import { ChevronDown, Check } from 'lucide-react'

export interface Model {
  id: string
  name: string
  description: string
  badge?: string
}

const SelectorWrapper = styled.div`
  position: relative;
`

const SelectorButton = styled.button.attrs({ type: 'button' })<{ $isOpen: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              background-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              box-shadow ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  height: 32px;
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => `0 ${theme.spacing[2]} 0 ${theme.spacing[2.5]}`};
  min-width: 4rem;
  white-space: nowrap;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  border: none;
  cursor: pointer;

  background-color: ${({ $isOpen, theme }) => $isOpen ? theme.color.muted : 'transparent'};
  color: ${({ $isOpen, theme }) => $isOpen ? theme.color.foreground : theme.color.mutedForeground};

  &:hover {
    color: ${({ $isOpen, theme }) => !$isOpen ? theme.color.foreground : 'inherit'};
    background-color: ${({ $isOpen, theme }) => !$isOpen ? theme.color.muted + '80' : 'inherit'};
  }

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }

  .arrow {
    transition: transform ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
    ${({ $isOpen }) => $isOpen && 'transform: rotate(180deg);'}
  }
`

const DropdownMenu = styled.div`
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: ${({ theme }) => `${theme.spacing[2]}`};
  width: 260px;
  background-color: ${({ theme }) => theme.color.background}f2;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.color.border}80;
  border-radius: ${({ theme }) => theme.radii.xl};
  box-shadow: ${({ theme }) => theme.shadow.md};
  overflow: hidden;
  z-index: 50;
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => `${theme.spacing[1.5]}`};
  animation: fadein ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};
  transform-origin: bottom right;
`

const DropdownItem = styled.button.attrs({ type: 'button' })`
  width: 100%;
  text-align: left;
  padding: ${({ theme }) => `${theme.spacing[2.5]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.lg};
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    background-color: ${({ theme }) => theme.color.muted};
  }

  &:focus-visible {
    outline: none;
    background-color: ${({ theme }) => theme.color.muted};
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => `${theme.spacing[2]}`};
  }

  .title {
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    font-weight: 600;
    color: ${({ theme }) => theme.color.foreground};
  }

  .desc {
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    color: ${({ theme }) => theme.color.mutedForeground};
  }

  .badge {
    padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[1.5]}`};
    border-radius: ${({ theme }) => theme.radii.md};
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    font-weight: 500;
    border: 1px solid ${({ theme }) => theme.color.border};
    color: ${({ theme }) => theme.color.mutedForeground};
  }
`

export function ModelSelector({ models, selectedModel, onSelect }: { models: Model[]; selectedModel: string; onSelect: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const theme = useTheme()

  const currentModel = models.find(m => m.id === selectedModel) || models[0]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleEscKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation()
        event.preventDefault()
        setIsOpen(false)
      }
    }
    const handleFocusOut = (event: FocusEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.relatedTarget as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      document.addEventListener("focusout", handleFocusOut)
      document.addEventListener("keydown", handleEscKeyDown, { capture: true })
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("focusout", handleFocusOut)
      document.removeEventListener("keydown", handleEscKeyDown, { capture: true })
    }
  }, [isOpen])

  return (
    <SelectorWrapper ref={dropdownRef}>
      <SelectorButton $isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
        <span style={{ fontWeight: 500 }}>{currentModel?.name || 'Default'}</span>
        <ChevronDown size={16} className="arrow" opacity={0.75} />
      </SelectorButton>

      {isOpen && (
        <DropdownMenu>
          {models.map(model => (
            <DropdownItem
              key={model.id}
              onClick={() => {
                onSelect(model.id)
                setIsOpen(false)
              }}
            >
              <div className="info">
                <div className="title-row">
                  <span className="title">{model.name}</span>
                  {model.badge && <span className="badge">{model.badge}</span>}
                </div>
                <span className="desc">{model.description}</span>
              </div>
              {selectedModel === model.id && (
                <Check size={16} color={theme.color.primary} style={{ marginTop: '4px' }} />
              )}
            </DropdownItem>
          ))}
        </DropdownMenu>
      )}
    </SelectorWrapper>
  )
}
