import React, { useEffect } from 'react'
import styled from 'styled-components'

export const PageContainer = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.color.background};
  padding: 16px;
  
  @media (min-width: 768px) {
    padding: 24px;
  }
`

export const PageContent = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
`

