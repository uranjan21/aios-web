import { Tabs } from 'antd'
import styled from 'styled-components'

export const AreaTabs = styled(Tabs)`
  .ant-tabs-nav {
    margin-bottom: 16px;
    padding-left: 8px;
    &::before { border-bottom: 1px solid hsl(var(--border) / 0.6); }
  }
  .ant-tabs-tab {
    color: hsl(var(--muted-foreground));
    font-size: 14px;
    padding: 10px 0;
    margin-right: 20px;
    transition: all 0.3s;
    &:hover { color: hsl(var(--foreground)); }
  }
  .ant-tabs-tab-active .ant-tabs-tab-btn {
    color: hsl(var(--foreground)) !important;
    font-weight: 600;
  }
  .ant-tabs-ink-bar {
    background: linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%);
    height: 3px;
    border-radius: 3px 3px 0 0;
  }
`;
