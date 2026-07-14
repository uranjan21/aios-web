import styled from "styled-components";
import { PAGE_MAX_WIDTH, PAGE_PADDING } from "@/theme/layout";

export const PageContainer = styled.main`
  min-height: 100vh;
  width: 100%;
  background: ${({ theme }) => theme.color.background};

  padding: ${PAGE_PADDING.mobile};

  @media (min-width: 768px) {
    padding: ${PAGE_PADDING.tablet};
  }

  @media (min-width: 1440px) {
    padding: ${PAGE_PADDING.desktop};
  }
`;

export const PageContent = styled.div`
  width: 100%;
  max-width: ${PAGE_MAX_WIDTH};
  margin: 0 auto;

  display: flex;
  flex-direction: column;
  gap: 24px;
`;
