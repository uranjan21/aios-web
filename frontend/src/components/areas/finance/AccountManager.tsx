import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Popconfirm } from '@/components/ui/Popconfirm';
import { Button, Badge, EmptyState, DataTable, Dialog } from '@ledgr/ui';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import styled from 'styled-components';
import dayjs from 'dayjs';
import { financeApi } from '@/api/areas';
import { formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/Card';

const LoadingText = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const EntriesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const EntryRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.color.border}66;
  
  &:last-child {
    border-bottom: 0;
  }
`

const EntryInfo = styled.div`
  min-width: 0;
`

const EntryLabel = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const EntryMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
`

const StyledBadge = styled(Badge)`
  font-size: 10px;
  line-height: 1.2;
  padding: 0;
  text-transform: capitalize;
`

const EntryDate = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const EntryAmount = styled.span<{ $isPositive: boolean }>`
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
  margin-left: 8px;
  color: ${({ $isPositive, theme }) => $isPositive ? theme.color.success : theme.color.destructive};
`

function AccountLedgerDrawer({ account, onClose }: { account: any | null; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['finance', 'accounts', account?.id, 'ledger'],
    queryFn: () => financeApi.accountLedger(account!.id),
    enabled: !!account,
  });

  return (
    <Dialog
      title={account ? `${account.name} — ${formatCurrency(Number(account.balance))}` : ''}
      open={!!account}
      onOpenChange={(v) => { if (!v) onClose(); }}
      size="md"
    >
      {isLoading ? (
        <LoadingText>Loading…</LoadingText>
      ) : !data?.entries.length ? (
        <EmptyState title="No transactions" description="No transactions linked to this account yet" />
      ) : (
        <EntriesList>
          {data.entries.map(e => (
            <EntryRow key={`${e.kind}-${e.id}`}>
              <EntryInfo>
                <EntryLabel>{e.label}</EntryLabel>
                <EntryMeta>
                  <StyledBadge tone={e.kind === 'expense' ? 'destructive' : e.kind === 'income' ? 'success' : 'info'}>{e.kind}</StyledBadge>
                  <EntryDate>{dayjs(e.logged_at).format('MMM D, YYYY h:mm A')}</EntryDate>
                </EntryMeta>
              </EntryInfo>
              <EntryAmount $isPositive={e.amount >= 0}>
                {e.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(e.amount))}
              </EntryAmount>
            </EntryRow>
          ))}
        </EntriesList>
      )}
    </Dialog>
  );
}

export const AccountManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [ledgerAccount, setLedgerAccount] = useState<any | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: financeApi.accounts
  });

  const deleteMutation = useMutation({
    mutationFn: financeApi.deleteAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] });
      toast.success('Account deleted');
    }
  });

  const columns = [
    { id: 'name', header: 'Name', cell: (row: any) => row.name },
    { id: 'type', header: 'Type', cell: (row: any) => row.type.replace('_', ' ').toUpperCase() },
    { id: 'balance', header: 'Balance', cell: (row: any) => `${row.currency} ${Number(row.balance).toFixed(2)}` },
    {
      id: 'action',
      header: 'Action',
      cell: (row: any) => (
        <Popconfirm title="Delete account?" onConfirm={() => deleteMutation.mutate(row.id)}>
          <Button variant="destructive" size="icon" onClick={e => e.stopPropagation()}>
            <Trash2 size={14} />
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card title="Accounts">
      <DataTable
        rows={accounts}
        columns={columns}
        getRowKey={row => row.id}
        loading={isLoading}
        onRowClick={row => setLedgerAccount(row)}
      />

      <AccountLedgerDrawer account={ledgerAccount} onClose={() => setLedgerAccount(null)} />
    </Card>
  );
};
