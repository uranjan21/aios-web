import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Popconfirm } from '@/components/ui/Popconfirm';
import { Button, Badge, EmptyState, DataTable, Dialog, Select, Card } from '@ledgr/ui';
import { Trash2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import styled from 'styled-components';
import dayjs from 'dayjs';
import { financeApi } from '@/api/areas';
import { formatCurrency } from '@/lib/utils';
import { PencilLine } from 'lucide-react';
import { Input } from '@ledgr/ui';

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
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Sync editing state
  React.useEffect(() => {
    if (editingAccount) setEditName(editingAccount.name);
  }, [editingAccount]);

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

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, name: string }) => financeApi.updateAccount(data.id, { name: data.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] });
      toast.success('Account updated');
      setEditingAccount(null);
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
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="outline" size="icon" onClick={(e) => { e.stopPropagation(); setEditingAccount(row); }}>
            <PencilLine size={14} />
          </Button>
          <Popconfirm title="Delete account?" onConfirm={() => deleteMutation.mutate(row.id)}>
            <Button variant="destructive" size="icon" onClick={e => e.stopPropagation()}>
              <Trash2 size={14} />
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  const accountTypes = Array.from(new Set(accounts.map((a: any) => a.type))) as string[];
  const visibleAccounts = typeFilter === 'all'
    ? accounts
    : accounts.filter((a: any) => a.type === typeFilter);

  return (
    <Card
      title="Accounts"
      subtitle="Your cash, bank, and wallet balances"
      icon={<Wallet size={16} />}
      action={
        <Select
          size="sm"
          fullWidth={false}
          aria-label="Filter accounts by type"
          value={typeFilter}
          onChange={(v) => setTypeFilter(String(v))}
          options={[
            { value: 'all', label: 'All types' },
            ...accountTypes.map((t) => ({ value: t, label: t.replace('_', ' ').toUpperCase() })),
          ]}
        />
      }
    >
      <DataTable
        rows={visibleAccounts}
        columns={columns}
        getRowKey={row => row.id}
        loading={isLoading}
        onRowClick={row => setLedgerAccount(row)}
      />

      <AccountLedgerDrawer account={ledgerAccount} onClose={() => setLedgerAccount(null)} />

      <Dialog title="Edit Account" open={!!editingAccount} onOpenChange={v => { if (!v) setEditingAccount(null) }}>
        <div style={{ padding: '4px 0 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: 12, fontWeight: 500 }}>Account Name</div>
          <Input value={editName} onChange={e => setEditName(e.target.value)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="ghost" onClick={() => setEditingAccount(null)}>Cancel</Button>
          <Button variant="primary" onClick={() => updateMutation.mutate({ id: editingAccount.id, name: editName })} loading={updateMutation.isPending}>Save</Button>
        </div>
      </Dialog>
    </Card>
  );
};
