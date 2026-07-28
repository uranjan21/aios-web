import styled from 'styled-components'

// Mimics AreaTabs' tab-list border-bottom, for pages that have no tabs.
export const PageDivider = styled.div`
  width: 100%;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  margin-top: -24px;
`
