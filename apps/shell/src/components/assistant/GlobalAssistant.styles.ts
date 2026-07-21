import styled from 'styled-components'
import { motion } from 'framer-motion'

export const FAB = styled(motion.button).attrs({ type: 'button' })`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.primaryForeground};
  border: none;
  box-shadow: ${({ theme }) => theme.shadow.lg};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 50;

  @media ${({ theme }) => theme.media.belowMd} {
    bottom: 88px; /* clear the mobile BottomNav (64px + margin) */
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }
`

export const ResizeHandle = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  z-index: 100;

  &:hover, &:active {
    background-color: ${({ theme }) => theme.color.primary}33;
  }
`

export const AssistantWindow = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  max-width: 100vw;
  height: 100vh;
  background-color: ${({ theme }) => theme.color.background}e6;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-left: 1px solid ${({ theme }) => theme.color.border}80;
  box-shadow: ${({ theme }) => theme.shadow.lg};
  display: flex;
  flex-direction: column;
  z-index: 50;
  overflow: hidden;
  font-family: ${({ theme }) => theme.typography?.fontFamily?.sans || '"DM Sans", sans-serif'};
`

export const AssistantHeader = styled.div`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-bottom: 1px solid ${({ theme }) => theme.color.border}80;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: ${({ theme }) => theme.color.background}b3;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  position: relative;
`

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const HeaderTitle = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.sans};
  font-weight: 600;
  font-size: 14px;
`

export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export const HeaderActionButton = styled.button.attrs({ type: 'button' })`
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  color: ${({ theme }) => theme.color.mutedForeground};
  transition: color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    color: ${({ theme }) => theme.color.foreground};
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: ${({ theme }) => theme.spacing[4]};
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.color.mutedForeground}4d;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const SettingsPanel = styled(motion.div)`
  position: absolute;
  top: 100%;
  right: 16px;
  width: 220px;
  background-color: ${({ theme }) => theme.color.background}f2;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid ${({ theme }) => theme.color.border}80;
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.shadow.md};
  padding: ${({ theme }) => theme.spacing[3]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  z-index: 60;

  @media ${({ theme }) => theme.media.belowMd} {
    width: calc(100% - 32px);
    left: 16px;
    right: 16px;
  }
`

export const SettingRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const SettingLabel = styled.label`
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.mutedForeground};
`

export const HistorySidebar = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 260px;
  background-color: ${({ theme }) => theme.color.background}e6;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-right: 1px solid ${({ theme }) => theme.color.border}80;
  z-index: 40;
  display: flex;
  flex-direction: column;
  box-shadow: ${({ theme }) => theme.shadow.sm};

  @media ${({ theme }) => theme.media.belowMd} {
    width: 100%;
    border-right: none;
  }
`

export const HistoryHeader = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 13px;
`

export const QuotaLine = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
  text-align: right;
  padding: 0 4px 4px;
`

export const EmptyStateContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: ${({ theme }) => theme.color.mutedForeground};
`

export const EmptyStateIconWrapper = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.radii.xl};
  background-color: ${({ theme }) => theme.color.primary}1a;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const QuickPromptsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 24px;
  width: 100%;
`

export const QuickPromptButton = styled.button.attrs({ type: 'button' })`
  padding: 8px 12px;
  font-size: 12px;
  border-radius: ${({ theme }) => theme.radii.md};
  text-align: left;
  background-color: transparent;
  border: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.foreground};
  cursor: pointer;
  transition: all ${({ theme }) => theme.motion.duration.normal} ${({ theme }) => theme.motion.easing.standard};

  &:hover {
    background-color: ${({ theme }) => theme.color.muted}80;
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.shadow.ring};
  }
`
