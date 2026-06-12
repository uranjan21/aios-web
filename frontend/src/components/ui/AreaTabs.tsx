import { Tabs } from 'antd'
import styled from 'styled-components'

export const AreaTabs = styled(Tabs)`
  .ant-tabs-nav {
    margin-bottom: 20px !important;
    &::before { border-bottom: 1.5px solid hsl(var(--border-divider) / 0.1) !important; }
  }
  .ant-tabs-ink-bar {
    background: hsl(var(--primary)) !important;
    height: 1.5px !important;
    border-radius: 0;
  }
  .ant-tabs-tab {
    font-size: 11px !important;
    font-weight: 500 !important;
    letter-spacing: 0.01em;
    text-transform: uppercase;
    color: hsl(var(--muted-foreground)) !important;
    margin-right: 4px !important;
    padding: 8px 12px !important;
    transition: color 0.15s ease !important;
    &:hover { color: hsl(var(--foreground)) !important; }
  }
  .ant-tabs-tab-active .ant-tabs-tab-btn {
    color: hsl(var(--foreground)) !important;
    font-weight: 600 !important;
  }
`
