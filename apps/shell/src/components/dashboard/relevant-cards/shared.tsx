import styled from 'styled-components'

/* ─────────────────────── Shared bits ─────────────────────── */

export const Empty = styled.p`
  margin: 8px 0 0 0;
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
  line-height: 1.4;
`
