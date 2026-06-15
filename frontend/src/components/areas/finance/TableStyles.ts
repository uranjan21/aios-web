import styled from 'styled-components';

export const TableContainer = styled.div`
  background: hsl(var(--card));
  border-radius: 24px;
  padding: 16px;
  border: none;
  box-shadow: var(--shadow-premium-sm);
  width: 100%;
  overflow-x: auto;
  height: 100%;
  
  .ant-table {
    background: transparent;
    color: hsl(var(--foreground));
  }
  
  /* Remove header background, use very subtle bottom border */
  .ant-table-thead > tr > th {
    background: transparent !important;
    color: hsl(var(--muted-foreground));
    border-bottom: 1px solid hsl(var(--border) / 0.4) !important;
    font-size: 10px;
    text-transform: uppercase;
    font-weight: 500;
    letter-spacing: 0.05em;
    padding-top: 6px;
    padding-bottom: 6px;
    padding-left: 8px !important;
    padding-right: 8px !important;
  }
  
  /* Very subtle row borders and tight padding */
  .ant-table-tbody > tr > td {
    border-bottom: 1px solid hsl(var(--border) / 0.2) !important;
    padding-top: 6px;
    padding-bottom: 6px;
    padding-left: 8px !important;
    padding-right: 8px !important;
    font-size: 11px;
  }
  
  /* Subtle hover */
  .ant-table-tbody > tr:hover > td {
    background: hsl(var(--muted) / 0.3) !important;
  }
  
  /* Remove border from last row */
  .ant-table-tbody > tr:last-child > td {
    border-bottom: none !important;
  }

  .ant-empty-description {
    color: hsl(var(--muted-foreground));
    font-size: 11px;
  }
  
  /* Summary row styling */
  .ant-table-summary {
    background: transparent !important;
  }
  .ant-table-summary > tr > td {
    background: transparent !important;
    border-top: 1px dashed hsl(var(--border)) !important;
    border-bottom: none !important;
    font-weight: 500;
    color: hsl(var(--foreground));
    padding-top: 8px;
    padding-bottom: 6px;
    font-size: 11px;
  }
`;

export const TableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  padding: 0 4px;
  h3 { 
    margin: 0; 
    color: hsl(var(--muted-foreground)); 
    font-size: 11px; 
    font-weight: 500; 
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

