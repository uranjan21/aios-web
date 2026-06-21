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
import { Skeleton } from '@/components/ui/skeleton';

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
        <EntriesList>
          {[1, 2, 3].map(i => (
            <EntryRow key={i}>
              <div style={{ flex: 1, marginRight: 16 }}>
                <Skeleton style={{ height: 16, width: '60%', marginBottom: 4 }} />
                <Skeleton style={{ height: 12, width: '40%' }} />
              </div>
              <Skeleton style={{ height: 16, width: 60 }} />
            </EntryRow>
          ))}
        </EntriesList>
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

const ACCOUNT_TYPE_OPTIONS = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit card' },
  { value: 'investment', label: 'Investment' },
  { value: 'loan', label: 'Loan' },
];

const CURRENCY_OPTIONS = [
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
];

type EditState = {
  name: string;
  type: string;
  balance: string;
  currency: string;
};

const EMPTY_EDIT_STATE: EditState = { name: '', type: 'checking', balance: '0', currency: 'INR' };

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 4px 0 8px;
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`;

const FieldLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
`;

const FullWidth = styled.div`
  grid-column: 1 / -1;
`;

export const AccountManager: React.FC = () => {
  const queryClient = useQueryClient();
  const [ledgerAccount, setLedgerAccount] = useState<any | null>(null);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<EditState>(EMPTY_EDIT_STATE);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Hydrate the edit form when an account is picked for editing.
  React.useEffect(() => {
    if (editingAccount) {
      setEditForm({
        name: editingAccount.name ?? '',
        type: editingAccount.type ?? 'checking',
        balance: String(editingAccount.balance ?? 0),
        currency: editingAccount.currency ?? 'INR',
      });
    }
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
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to delete account'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { name: string; type: string; balance: number; currency: string } }) =>
      financeApi.updateAccount(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'net-worth'] });
      toast.success('Account updated');
      setEditingAccount(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to update account'),
  });

  const closeEdit = () => {
    setEditingAccount(null);
    setEditForm(EMPTY_EDIT_STATE);
  };

  const handleSave = () => {
    if (!editingAccount) return;
    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      toast.error('Name is required');
      return;
    }
    const balanceNum = parseFloat(editForm.balance);
    if (Number.isNaN(balanceNum)) {
      toast.error('Balance must be a number');
      return;
    }
    updateMutation.mutate({
      id: editingAccount.id,
      patch: {
        name: trimmedName,
        type: editForm.type,
        balance: balanceNum,
        currency: editForm.currency.trim().toUpperCase(),
      },
    });
  };

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

      <Dialog title="Edit Account" open={!!editingAccount} onOpenChange={v => { if (!v) closeEdit(); }}>
        <FormGrid>
          <FullWidth>
            <FieldLabel htmlFor="edit-account-name">
              Account name
              <Input
                id="edit-account-name"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. HDFC Savings"
                autoFocus
              />
            </FieldLabel>
          </FullWidth>
          <FieldLabel htmlFor="edit-account-type">
            Type
            <Select
              id="edit-account-type"
              fullWidth
              size="md"
              value={editForm.type}
              onChange={(v) => setEditForm(f => ({ ...f, type: String(v) }))}
              options={ACCOUNT_TYPE_OPTIONS}
              aria-label="Account type"
            />
          </FieldLabel>
          <FieldLabel htmlFor="edit-account-currency">
            Currency
            <Select
              id="edit-account-currency"
              fullWidth
              size="md"
              value={editForm.currency}
              onChange={(v) => setEditForm(f => ({ ...f, currency: String(v) }))}
              options={CURRENCY_OPTIONS}
              aria-label="Currency"
            />
          </FieldLabel>
          <FullWidth>
            <FieldLabel htmlFor="edit-account-balance">
              Balance
              <Input
                id="edit-account-balance"
                type="number"
                step="0.01"
                value={editForm.balance}
                onChange={e => setEditForm(f => ({ ...f, balance: e.target.value }))}
                startAdornment={editForm.currency || '₹'}
              />
            </FieldLabel>
          </FullWidth>
        </FormGrid>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: 4 }}>
          <Button variant="ghost" onClick={closeEdit} disabled={updateMutation.isPending}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} loading={updateMutation.isPending}>Save changes</Button>
        </div>
      </Dialog>
    </Card>
  );
};
