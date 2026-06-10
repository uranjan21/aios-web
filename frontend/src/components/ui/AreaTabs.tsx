import { Tabs } from 'antd'
import styled from 'styled-components'

export const AreaTabs = styled(Tabs)`
  .ant-tabs-nav {
    margin-bottom: 16px !important;
    &::before { border-color: hsl(var(--border)) !important; }
  }
  .ant-tabs-ink-bar {
    background: hsl(var(--primary)) !important;
    height: 2px !important;
    border-radius: 1px;
  }
  .ant-tabs-tab {
    font-size: 13px !important;
    font-weight: 500 !important;
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
