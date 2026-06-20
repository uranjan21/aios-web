import React from 'react'
import styled from 'styled-components'

export interface StyledIconProps {
  children: React.ReactElement
  size?: number | string
}

const IconWrapper = styled.span<{ $size?: number | string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 0;
  svg {
    width: ${({ $size }) => (typeof $size === 'number' ? `${$size}px` : ($size ?? '16px'))};
    height: ${({ $size }) => (typeof $size === 'number' ? `${$size}px` : ($size ?? '16px'))};
  }
`

export const StyledIcon: React.FC<StyledIconProps> = ({ children, size }) => {
  return <IconWrapper $size={size}>{children}</IconWrapper>
}
