import styled, { keyframes } from 'styled-components'
import { Loader2, Archive } from 'lucide-react'

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const bounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
`

export const StyledSpinner = styled(Loader2)`
  animation: ${spin} 1s linear infinite;
`

export const StyledBounceArchive = styled(Archive)`
  animation: ${bounce} 1s ease-in-out infinite;
`

export const ChatContainer = styled.div<{ $isDragging: boolean }>`
  position: relative;
  width: 100%;
  transition: all ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
`

export const InputBox = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.color.border}80;
  background-color: ${({ theme }) => theme.color.background}b3;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  box-shadow: ${({ theme }) => theme.shadow.md};
  transition: all ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    box-shadow: ${({ theme }) => theme.shadow.lg};
  }

  &:focus-within {
    box-shadow: ${({ theme }) => theme.shadow.ring};
    border-color: ${({ theme }) => theme.color.primary}80;
  }
`

export const InnerPadding = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[3]} ${theme.spacing[2]} ${theme.spacing[3]}`};
  gap: ${({ theme }) => `${theme.spacing[2]}`};
`

export const ArtifactsRow = styled.div`
  display: flex;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  overflow-x: auto;
  padding-bottom: ${({ theme }) => `${theme.spacing[2]}`};
  padding-left: ${({ theme }) => `${theme.spacing[1]}`};
  padding-right: ${({ theme }) => `${theme.spacing[1]}`};

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.mutedForeground}4d;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const TextAreaWrapper = styled.div`
  position: relative;
  max-height: 384px;
  width: 100%;
  overflow-y: auto;
  min-height: 40px;
  padding-left: ${({ theme }) => `${theme.spacing[1]}`};
  margin: 0;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.mutedForeground}4d;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const StyledTextarea = styled.textarea`
  width: 100%;
  background: transparent;
  border: 0;
  outline: none;
  color: ${({ theme }) => theme.color.foreground};
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  resize: none;
  overflow: hidden;
  padding: 0;
  line-height: 1.5;
  font-family: inherit;

  &::placeholder {
    color: ${({ theme }) => theme.color.mutedForeground};
  }
`

export const ActionBar = styled.div`
  display: flex;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  width: 100%;
  align-items: center;
`

export const LeftTools = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  min-width: 0;
`

export const ToolButton = styled.button.attrs({ type: 'button' })<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: transform ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              background-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              box-shadow ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
  height: 32px;
  width: 32px;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: none;
  cursor: pointer;

  color: ${({ $active, theme }) => $active ? theme.color.primary : theme.color.mutedForeground};
  background-color: ${({ $active, theme }) => $active ? theme.color.primary + '1a' : 'transparent'};

  &:hover {
    color: ${({ $active, theme }) => !$active ? theme.color.foreground : 'inherit'};
    background-color: ${({ $active, theme }) => !$active ? theme.color.muted + '80' : 'inherit'};
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }

  .tooltip {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: ${({ theme }) => `${theme.spacing[2]}`};
    padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
    background: ${({ theme }) => theme.color.foreground};
    color: ${({ theme }) => theme.color.background};
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    font-weight: 500;
    border-radius: ${({ theme }) => theme.radii.sm};
    opacity: 0;
    pointer-events: none;
    transition: opacity ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};
    white-space: nowrap;
    z-index: 50;
    box-shadow: ${({ theme }) => theme.shadow.sm};
  }

  &:hover .tooltip {
    opacity: 1;
  }
`

export const RightTools = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1]}`};
  min-width: 0;
`

export const SendButton = styled.button.attrs({ type: 'button' })<{ $hasContent: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  width: 32px;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: none;
  transition: transform ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard},
              background-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              opacity ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard},
              box-shadow ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  background-color: ${({ $hasContent, theme }) => $hasContent ? theme.color.primary : theme.color.primary + '4d'};
  color: ${({ $hasContent, theme }) => $hasContent ? theme.color.primaryForeground : theme.color.primaryForeground + '99'};
  cursor: ${({ $hasContent }) => $hasContent ? 'pointer' : 'not-allowed'};
  box-shadow: ${({ $hasContent, theme }) => $hasContent ? theme.shadow.sm : 'none'};

  &:disabled {
    cursor: not-allowed;
  }

  &:hover {
    opacity: ${({ $hasContent }) => $hasContent ? 0.9 : 1};
  }

  &:active {
    transform: ${({ $hasContent }) => $hasContent ? 'scale(0.95)' : 'none'};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }
`

export const DragOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: ${({ theme }) => theme.color.background}e6;
  border: 2px dashed ${({ theme }) => theme.color.primary};
  border-radius: ${({ theme }) => theme.radii['2xl'] || '16px'};
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  pointer-events: none;

  p {
    color: ${({ theme }) => theme.color.primary};
    font-weight: 500;
    margin-top: ${({ theme }) => `${theme.spacing[2]}`};
  }
`

export const Disclaimer = styled.div`
  text-align: center;
  margin-top: ${({ theme }) => `${theme.spacing[4]}`};
  p {
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    color: ${({ theme }) => theme.color.foreground};
  }
`

export const ModelSelectorWrapper = styled.div`
  display: flex;
  align-items: center;
`

export const ContextDropdown = styled.div`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  background: ${({ theme }) => theme.color.background};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadow.md};
  padding: ${({ theme }) => `${theme.spacing[1]}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  z-index: 100;
  min-width: 150px;
`

export const ContextOption = styled.button.attrs({ type: 'button' })<{ $active?: boolean }>`
  text-align: left;
  padding: ${({ theme }) => `${theme.spacing[1.5]} ${theme.spacing[2.5]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  border: none;
  background: ${({ theme, $active }) => $active ? theme.color.muted : 'transparent'};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  color: ${({ theme }) => theme.color.foreground};
  transition: background-color ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    background: ${({ theme }) => theme.color.muted};
  }

  &:focus-visible {
    outline: none;
    background: ${({ theme }) => theme.color.muted};
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }
`
