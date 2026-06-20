import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog'
import type { ReactNode } from 'react'
import styled from 'styled-components'

export const AlertDialog = AlertDialogPrimitive.Root
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger
export const AlertDialogCancel = AlertDialogPrimitive.Cancel
export const AlertDialogAction = AlertDialogPrimitive.Action
export const AlertDialogTitle = AlertDialogPrimitive.Title
export const AlertDialogDescription = AlertDialogPrimitive.Description

const Overlay = styled(AlertDialogPrimitive.Overlay)`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.overlay};
  background: ${({ theme }) => theme.color.overlay};
  backdrop-filter: blur(2px);
`

const StyledContent = styled(AlertDialogPrimitive.Content)`
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  z-index: ${({ theme }) => theme.zIndex.modal};
  width: 100%;
  max-width: 420px;
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii['2xl']};
  padding: 24px;
  box-shadow: ${({ theme }) => theme.shadow.xl};
`

export function AlertDialogContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <AlertDialogPrimitive.Portal>
      <Overlay />
      <StyledContent className={className}>{children}</StyledContent>
    </AlertDialogPrimitive.Portal>
  )
}

export function AlertDialogHeader({ children }: { children: ReactNode }) {
  return <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
}

export function AlertDialogFooter({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>{children}</div>
}
