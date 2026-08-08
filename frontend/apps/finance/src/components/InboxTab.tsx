/**
 * Finance → Inbox.
 *
 * Phase 4 conversion to the canvas's `finance:inbox` composition —
 * queue(12) · controls(6) · rows(6) — rebuilt from the live pending-transaction
 * API. This is also where the retired **Rules** tab lands (plan §7 records it as
 * a relocation, not a deletion): the merchant rules and the auto-commit window
 * are the `controls` module.
 *
 * The queue's two buttons are the canvas's own: Approve commits with the
 * pre-filled account and category, Change opens the editor for that row — which
 * is where the old per-row inline selects went, along with Dismiss.
 *
 * ONE DEPARTURE: the canvas's third module is "filed automatically today". The
 * auto-commit path writes straight to the ledger and keeps no separate log, so
 * the module lists ledger entries the tracker filed, found by the origin tag it
 * stamps. Same question, from the record that actually exists.
 */
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import styled from 'styled-components'
import { Button, Card, Dialog, EmptyState, Input, Select, SkeletonPage } from '@ledgr/ui'
import { CheckSquare, Inbox as InboxIcon, Zap } from 'lucide-react'
import { financeApi, type FinancePendingTransaction } from '@ct/shared/api/areas'
import { agentsApi } from '@ct/shared/api/agents'
import { ModuleGrid, type ModuleSpec } from '@ct/shared/components/modules'
import { formatCurrency } from '@ct/shared/lib/utils'
import { track } from '@ct/shared/lib/analytics'

const Root = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[5]};
`

const Form = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const DialogActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding-top: ${({ theme }) => theme.spacing[2]};
`

const Spacer = styled.div`
  flex: 1;
`

/** The origin marker the tracker stamps on anything it files by itself. */
const TRACKER_TAG = 'upi-tracker'

const AUTO_COMMIT_OPTIONS = ['Off', '6 hours', '24 hours', '72 hours']
const AUTO_COMMIT_HOURS: Record<string, number | null> = {
  'Off': null, '6 hours': 6, '24 hours': 24, '72 hours': 72,
}
const hoursToLabel = (h: number | null) =>
  AUTO_COMMIT_OPTIONS.find(o => AUTO_COMMIT_HOURS[o] === h) ?? 'Off'

/** Two-letter monogram standing in for a merchant logo, as the canvas draws. */
function monogram(name: string | null): string {
  const clean = (name ?? '?').trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return clean.slice(0, 2).toUpperCase() || '??'
}

type Edit = { amount: string; account_id: string; category_id: string; description: string }

export function InboxTab() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<FinancePendingTransaction | null>(null)
  const [edit, setEdit] = useState<Edit>({ amount: '', account_id: '', category_id: '', description: '' })

  const { data: pending, isLoading } = useQuery({
    queryKey: ['finance', 'pending'],
    queryFn: financeApi.pending,
  })
  const { data: accounts } = useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: financeApi.accounts,
    staleTime: 60_000,
  })
  const { data: categories } = useQuery({
    queryKey: ['finance', 'categories'],
    queryFn: () => financeApi.categories('expense'),
    staleTime: 60_000,
  })
  const { data: rules } = useQuery({
    queryKey: ['finance', 'rules'],
    queryFn: financeApi.rules,
    staleTime: 60_000,
  })
  const { data: settings } = useQuery({
    queryKey: ['finance', 'settings'],
    queryFn: financeApi.settings,
    staleTime: 60_000,
  })
  const { data: stats } = useQuery({
    queryKey: ['finance', 'pending', 'stats'],
    queryFn: financeApi.pendingStats,
    staleTime: 30_000,
  })

  const { data: autoFiled } = useQuery({
    queryKey: ['finance', 'auto-filed'],
    /* `source`, not `tag`: the origin marker is written to FinanceExpense.source,
     * while `tag` matches only the user's own labels — so the tag query this
     * used to run could never match an expense and the card was always empty.
     * A substring match covers both 'upi-tracker' (approved by hand) and
     * 'upi-tracker-auto' (filed by the auto-commit window). */
    queryFn: () => financeApi.searchTransactions({ source: TRACKER_TAG, limit: 6 }),
    staleTime: 60_000,
  })

  /* Approving writes a LEDGER row and moves an account balance, so the whole
   * finance cache is stale — not just the queue. Invalidating only the pending
   * keys left Transactions, cashflow, budgets and account balances serving
   * pre-approval data for the global 30s staleTime, which is one of the two
   * reasons an approved transaction looked like it had vanished. */
  const refreshQueue = () => {
    qc.invalidateQueries({ queryKey: ['finance'] })
  }

  /** Open Transactions on the period a row was actually filed into. */
  const viewInLedger = (loggedAt: string) =>
    navigate(`/app/finance/transactions?date=${dayjs(loggedAt).format('YYYY-MM-DD')}`)

  const approve = useMutation({
    mutationFn: ({ tx, payload }: { tx: FinancePendingTransaction; payload: any }) =>
      financeApi.approvePending(tx.id, payload),
    onSuccess: (_data, { tx }) => {
      track('pending_txn_approved')
      /* An email transaction is dated when it HAPPENED, so it files into that
       * month — usually not the one Transactions opens on. Reporting only
       * "approved" is what made a correctly-filed row look lost. */
      const when = dayjs(tx.logged_at)
      toast.success(`Filed to ${when.format('D MMM YYYY')}`, {
        description: when.isSame(dayjs(), 'month')
          ? undefined
          : `That is ${when.format('MMMM')} — Transactions opens on the current month.`,
        action: { label: 'View', onClick: () => viewInLedger(tx.logged_at) },
      })
      setEditing(null)
      refreshQueue()
    },
    onError: (e: any, { tx, payload }) => {
      /* 409 = a same-day, same-amount row already exists. That is a hint, not
       * proof — two genuine ₹100 purchases on one day collide — so offer the
       * override rather than telling the user to discard a real transaction. */
      if (e?.response?.status === 409) {
        toast.warning(e.response.data?.detail ?? 'This looks like a duplicate', {
          action: {
            label: 'File anyway',
            onClick: () => approve.mutate({ tx, payload: { ...payload, force: true } }),
          },
        })
        return
      }
      toast.error(e?.response?.data?.detail || 'Failed to approve transaction')
    },
  })

  const dismiss = useMutation({
    mutationFn: (id: string) => financeApi.dismissPending(id),
    onSuccess: () => { toast.success('Transaction dismissed'); setEditing(null); refreshQueue() },
    onError: () => toast.error('Failed to dismiss transaction'),
  })

  const approveAll = useMutation({
    mutationFn: (ids: string[]) => financeApi.bulkApprovePending(ids),
    onSuccess: (r, ids) => {
      if (r.approved > 0) track('pending_txn_approved', { bulk: true, count: r.approved })
      /* Report the oldest period anything landed in, and offer to go there —
       * a bulk approve of email transactions usually files into last month. */
      const skippedIds = new Set(r.skipped.map(s => s.id))
      const filed = rows.filter(t => ids.includes(t.id) && !skippedIds.has(t.id))
      const oldest = filed.length
        ? filed.reduce((a, b) => (a.logged_at <= b.logged_at ? a : b))
        : null
      toast.success(`Approved ${r.approved} transaction${r.approved === 1 ? '' : 's'}`, {
        // The server says WHY each row was skipped (duplicate / no account);
        // the old copy guessed at "duplicates or missing data" for all of them.
        description: r.skipped.length
          ? `Skipped ${r.skipped.length}: ${[...new Set(r.skipped.map(s => s.reason))].join(' · ')}`
          : oldest
            ? `Filed from ${dayjs(oldest.logged_at).format('D MMM YYYY')}`
            : undefined,
        ...(oldest && { action: { label: 'View', onClick: () => viewInLedger(oldest.logged_at) } }),
      })
      refreshQueue()
    },
    onError: () => toast.error('Bulk approve failed'),
  })

  const dismissAll = useMutation({
    mutationFn: (ids: string[]) => financeApi.bulkDismissPending(ids),
    onSuccess: (r) => { toast.success(`Dismissed ${r.dismissed} transaction(s)`); refreshQueue() },
    onError: () => toast.error('Bulk dismiss failed'),
  })

  const toggleRule = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => financeApi.patchRule(id, { is_active: on }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance', 'rules'] }); toast.success('Rule updated') },
    onError: () => toast.error('Could not update the rule'),
  })

  const setAutoCommit = useMutation({
    mutationFn: (hours: number | null) => financeApi.updateSettings({ auto_commit_hours: hours }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'settings'] })
      refreshQueue()
      toast.success('Review window updated')
    },
    onError: () => toast.error('Could not update the review window'),
  })

  const fetchNow = useMutation({
    mutationFn: () => agentsApi.trigger('ct-upi-tracker'),
    onSuccess: () => {
      toast.success('Transaction Tracker is running — new items appear here shortly')
      setTimeout(refreshQueue, 6000)
    },
    onError: () => toast.error('Could not trigger the tracker'),
  })

  const rows = useMemo(() => pending ?? [], [pending])
  const activeRules = useMemo(() => rules ?? [], [rules])

  const categoryOptions = useMemo(
    () => [{ value: '', label: 'No category' }, ...(categories ?? []).map(c => ({ value: c.id, label: c.name }))],
    [categories],
  )
  const accountOptions = useMemo(
    () => [{ value: '', label: 'Select an account' }, ...(accounts ?? []).map(a => ({ value: a.id, label: a.name }))],
    [accounts],
  )
  const categoryName = (id: string | null) => (categories ?? []).find(c => c.id === id)?.name ?? null

  const openEdit = (tx: FinancePendingTransaction) => {
    setEditing(tx)
    setEdit({
      amount: String(tx.amount),
      // Pre-fill: stored account, else the account last used for this inbox.
      account_id: tx.account_id ?? tx.suggested_account_id ?? '',
      // Pre-fill the server-matched category so approving is one click.
      category_id: tx.category_id ?? '',
      description: tx.description ?? '',
    })
  }

  const quickApprove = (tx: FinancePendingTransaction) => {
    const accountId = tx.account_id ?? tx.suggested_account_id
    if (!accountId) {
      toast.error('Pick an account first')
      openEdit(tx)
      return
    }
    approve.mutate({
      tx,
      payload: {
        amount: tx.amount,
        account_id: accountId,
        category_id: tx.category_id ?? null,
        description: tx.description,
      },
    })
  }

  const modules = useMemo<ModuleSpec[]>(() => {
    const specs: ModuleSpec[] = []

    /* Throughput, which the queue card cannot show: it renders what is still
     * waiting, so on the good day — nothing waiting — it disappears and takes
     * the evidence of work done with it. These tiles survive an empty queue. */
    if (stats) {
      const filed = stats.filed_automatically_today + stats.filed_manually_today
      specs.push({
        kind: 'tiles',
        span: 12,
        tiles: [
          {
            label: 'Awaiting review',
            value: String(stats.pending_count),
            sub: stats.pending_count === 0 ? 'Inbox clear' : 'Approve or dismiss to file',
            subKey: stats.pending_count === 0 ? 'success' : 'warning',
            dotKey: stats.pending_count === 0 ? 'success' : 'warning',
          },
          {
            label: 'Oldest waiting',
            value: stats.oldest_pending_at
              ? (dayjs().diff(dayjs(stats.oldest_pending_at), 'day') === 0
                  ? 'Today'
                  : `${dayjs().diff(dayjs(stats.oldest_pending_at), 'day')}d`)
              : '—',
            sub: stats.oldest_pending_at ? 'Since the oldest item arrived' : 'Nothing waiting',
          },
          {
            label: 'Filed automatically',
            value: String(stats.filed_automatically_today),
            sub: 'Today, by auto-commit',
          },
          {
            label: 'Filed by you',
            value: String(stats.filed_manually_today),
            sub: filed === 0 ? 'Nothing filed today yet' : 'Today, reviewed by hand',
          },
        ],
      })
    }

    if (rows.length) {
      const oldest = rows.reduce((a, b) => (a.logged_at <= b.logged_at ? a : b))
      const ageDays = dayjs().diff(dayjs(oldest.logged_at), 'day')
      specs.push({
        kind: 'queue',
        span: 12,
        title: 'Needs review',
        subtitle: `${rows.length} transaction${rows.length === 1 ? '' : 's'} · oldest ${ageDays === 0 ? 'today' : `${ageDays} day${ageDays === 1 ? '' : 's'} old`}`,
        icon: InboxIcon,
        /* Fetch/Dismiss act on this queue, so they sit in its header beside
         * Approve all rather than portalling into a page header. The empty
         * state below carries its own Fetch now, since this card is gone then. */
        actionNode: (
          <>
            <Button size="sm" variant="outline" onClick={() => fetchNow.mutate()} loading={fetchNow.isPending}>
              Fetch now
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => dismissAll.mutate(rows.map(t => t.id))}
              loading={dismissAll.isPending}
            >
              Dismiss all
            </Button>
          </>
        ),
        action: 'Approve all',
        onAction: () => approveAll.mutate(rows.map(t => t.id)),
        rows: rows.map((tx) => {
          const cat = categoryName(tx.category_id) ?? tx.suggested_category
          const hasAccount = !!(tx.account_id ?? tx.suggested_account_id)
          return {
            mono: monogram(tx.payee_name ?? tx.description),
            title: tx.payee_name ?? tx.description ?? 'Unknown merchant',
            meta: [
              dayjs(tx.logged_at).format('D MMM'),
              tx.source_account_email ?? 'no source inbox',
            ].join(' · '),
            amount: `${tx.transaction_type === 'income' ? '+' : '-'}${formatCurrency(tx.amount)}`,
            amountKey: tx.transaction_type === 'income' ? 'success' : 'destructive',
            suggestion: cat ? `Suggested: ${cat}` : hasAccount ? 'No category' : 'Needs an account',
            suggestKey: cat ? 'info' : 'warning',
            primary: 'Approve',
            secondary: 'Change',
            flag: !hasAccount,
            busy: (approve.isPending && approve.variables?.tx.id === tx.id)
              || (dismiss.isPending && dismiss.variables === tx.id),
          }
        }),
        onPrimary: (i: number) => quickApprove(rows[i]),
        onSecondary: (i: number) => openEdit(rows[i]),
      })
    }

    specs.push({
      kind: 'controls',
      span: 6,
      title: 'Auto-categorization rules',
      subtitle: activeRules.length
        ? 'Applied before anything reaches this inbox'
        : 'No rules yet — categories are matched by name',
      icon: Zap,
      rows: [
        ...activeRules.map((r) => ({
          title: r.pattern,
          meta: `${r.match_type} · ${categoryName(r.category_id) ?? 'no category'}`,
          control: 'toggle' as const,
          on: r.is_active,
          busy: toggleRule.isPending && toggleRule.variables?.id === r.id,
        })),
        {
          title: 'Commit without review after',
          meta: 'Items sit in this inbox until the window passes',
          control: 'segment' as const,
          options: AUTO_COMMIT_OPTIONS,
          value: hoursToLabel(settings?.auto_commit_hours ?? null),
          busy: setAutoCommit.isPending,
        },
      ],
      onToggle: (i: number, next: boolean) => {
        if (i < activeRules.length) toggleRule.mutate({ id: activeRules[i].id, on: next })
      },
      onSelect: (i: number, value: string) => {
        if (i === activeRules.length) setAutoCommit.mutate(AUTO_COMMIT_HOURS[value] ?? null)
      },
    })

    /* Renders whether or not anything is queued. This is the receipt for an
     * approval — the surface that answers "where did it go?" — so hiding it at
     * inbox zero removed it exactly when it was the only thing left to show.
     * Rows carry the full date and open the ledger on that period, because the
     * filing date is the email's transaction date, not today. */
    const filed = autoFiled?.items ?? []
    specs.push({
      kind: 'rows',
      span: 6,
      title: 'Recently filed',
      subtitle: filed.length
        ? 'Captured from email and written to your ledger'
        : 'Nothing has been filed from email yet',
      icon: CheckSquare,
      rows: filed.map((t) => ({
        title: t.description ?? t.category ?? 'Transaction',
        meta: dayjs(t.logged_at).format('D MMM YYYY'),
        ...(t.category && { tagLabel: t.category, tagColorKey: 'info' }),
        value: formatCurrency(t.amount),
      })),
      onRowClick: (i: number) => filed[i] && viewInLedger(filed[i].logged_at),
    })

    return specs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, activeRules, autoFiled, categories, settings, stats,
      approve.isPending, dismiss.isPending, toggleRule.isPending, setAutoCommit.isPending,
      fetchNow.isPending, dismissAll.isPending])

  if (isLoading) return <SkeletonPage kpis={4} modules={[12, 12]} />

  return (
    <Root>
      {/* Tiles lead even on an empty queue — they are the summary, and "filed
          today" is the one number that survives inbox zero. The empty card
          follows to explain the absence and offer the next action. */}
      <ModuleGrid modules={modules} />

      {rows.length === 0 && (
        <Card title="Review queue" subtitle="Transactions captured from your email" icon={<InboxIcon size={16} />}>
          <EmptyState
            icon={<InboxIcon size={20} />}
            title="Inbox zero"
            description="Transactions the tracker finds in your email land here for review. Connect Gmail in Settings if you have not yet."
            action={<Button size="sm" onClick={() => fetchNow.mutate()} loading={fetchNow.isPending}>Fetch now</Button>}
          />
        </Card>
      )}

      <Dialog
        open={!!editing}
        icon={<InboxIcon size={18} />}
        eyebrow="Review"
        title={editing?.payee_name ?? editing?.description ?? 'Transaction'}
        description={editing?.raw_email_snippet ?? undefined}
        onOpenChange={(open) => { if (!open) setEditing(null) }}
        size="sm"
      >
        <Form>
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              startAdornment="₹"
              min="0"
              step="0.01"
              value={edit.amount}
              onChange={(e: any) => setEdit(s => ({ ...s, amount: e.target.value }))}
            />
          </div>
          <div>
            <Label>Account</Label>
            <Select
              fullWidth
              value={edit.account_id}
              onChange={(v: any) => setEdit(s => ({ ...s, account_id: String(v) }))}
              options={accountOptions}
            />
          </div>
          <div>
            <Label>Category</Label>
            <Select
              fullWidth
              value={edit.category_id}
              onChange={(v: any) => setEdit(s => ({ ...s, category_id: String(v) }))}
              options={categoryOptions}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={edit.description}
              onChange={(e: any) => setEdit(s => ({ ...s, description: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <DialogActions>
            <Button
              variant="primary"
              loading={approve.isPending}
              disabled={!edit.account_id}
              onClick={() => editing && approve.mutate({
                tx: editing,
                payload: {
                  amount: Number(edit.amount),
                  account_id: edit.account_id || null,
                  category_id: edit.category_id || null,
                  description: edit.description || editing.description,
                },
              })}
            >
              Approve
            </Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Spacer />
            <Button
              variant="destructive"
              size="sm"
              loading={dismiss.isPending}
              onClick={() => editing && dismiss.mutate(editing.id)}
            >
              Dismiss
            </Button>
          </DialogActions>
        </Form>
      </Dialog>
    </Root>
  )
}
