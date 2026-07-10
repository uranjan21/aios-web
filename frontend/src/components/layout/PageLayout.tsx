import styled from "styled-components";

export const PageContainer = styled.main`
  min-height: 100vh;
  width: 100%;
  background: ${({ theme }) => theme.color.background};

  padding: 16px;

  @media (min-width: 768px) {
    padding: 24px;
  }

  @media (min-width: 1440px) {
    padding: 32px;
  }
`;

export const PageContent = styled.div`
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;

  display: flex;
  flex-direction: column;
  gap: 24px;
`;
