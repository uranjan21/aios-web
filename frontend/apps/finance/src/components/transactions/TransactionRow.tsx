import { useState, useEffect, useRef, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Input, EmptyState, Badge, Checkbox,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  ConfirmDialog, focusRing } from '@ledgr/ui'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { PencilLine, Trash2, Check, X, Tag as TagIcon, FolderInput, MoreHorizontal, Split } from 'lucide-react'
import { financeApi } from '@ct/shared/api/areas'
import { formatAmount, formatCurrency } from '@ct/shared/lib/utils'
import styled from 'styled-components'

import type { Txn, SortBy, SortDir } from './types'
import { keyOf, buildRenderModel, getCategoryIcon, txnColors, useCategoryLabel, useAccountName } from './utils'

// ── Transaction row styled ───────────────────────────────────────────────────

/*
 * The redesign canvas draws this page as a five-column table — DATE, MERCHANT,
 * CATEGORY, ACCOUNT, AMOUNT — rather than the icon + stacked-meta list it used
 * to be. One track definition is shared by the header and every row so the
 * columns actually line up; change it in one place.
 *
 * Below `md` the grid is abandoned entirely: five columns on a phone is the
 * horizontal-scroll pattern MOBILE STRICT bans, so the row falls back to two
 * stacked lines with the amount pinned right.
 */
export const TXN_COLS = '20px 72px minmax(0, 1.7fr) minmax(0, 1.05fr) minmax(0, 1.05fr) 116px'

export const TxnRowRoot = styled.div<{ $selected: boolean; $active: boolean; $compact: boolean }>`
  display: grid;
  grid-template-columns: ${TXN_COLS};
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  padding: ${({ $compact }) => ($compact ? '6px 8px' : '11px 8px')};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  &:last-child { border-bottom: none; }
  position: relative;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $selected }) => $selected ? `color-mix(in srgb, ${theme.color.primary} 6%, transparent)` : 'transparent'};
  box-shadow: ${({ theme, $active }) => $active ? `inset 0 0 0 1.5px ${theme.color.primary}` : 'none'};
  transition: background 100ms ease;
  &:hover { background: ${({ theme, $selected }) => $selected ? `color-mix(in srgb, ${theme.color.primary} 9%, transparent)` : theme.color.muted}; }
  &:hover .txn-actions { opacity: 1; }

  @media ${({ theme }) => theme.media.belowMd} {
    grid-template-columns: 20px minmax(0, 1fr) auto;
    row-gap: ${({ theme }) => `${theme.spacing[1]}`};
  }
`

/** Header row above the list. Same tracks, so the labels sit over their cells. */
export const TxnHeaderRoot = styled.div`
  display: grid;
  grid-template-columns: ${TXN_COLS};
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  padding: ${({ theme }) => `0 ${theme.spacing[2]} ${theme.spacing[2.5]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  span {
    font-size: ${({ theme }) => theme.typography.fontSize.xs};
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: ${({ theme }) => theme.color.mutedForeground};
  }

  /* The mobile row has no columns to label. */
  @media ${({ theme }) => theme.media.belowMd} { display: none; }
`

const RowCheck = styled.div<{ $show: boolean }>`
  display: flex;
  align-items: center;
  opacity: ${({ $show }) => ($show ? 1 : 0)};
  transition: opacity 100ms ease;
  ${TxnRowRoot}:hover & { opacity: 1; }

  @media ${({ theme }) => theme.media.belowMd} {
    opacity: 1;
    grid-row: span 2;
  }
`

const TxnDate = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  @media ${({ theme }) => theme.media.belowMd} {
    grid-column: 2;
    grid-row: 2;
  }
`

const TxnCell = styled.div`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.color.mutedForeground};
`

/** CATEGORY and ACCOUNT collapse into the date line on a phone. */
const SecondaryCell = styled(TxnCell)`
  @media ${({ theme }) => theme.media.belowMd} { display: none; }
`

const TxnDesc = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CategoryChip = styled.span<{ $bg: string; $color: string }>`
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: ${({ theme }) => `${theme.spacing[0.5]} ${theme.spacing[2.5]}`};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/*
 * The action cluster overlays the amount column on hover rather than taking a
 * column of its own — a permanent actions column would push AMOUNT off the
 * right edge the canvas anchors it to.
 */
const TxnActions = styled.div`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[0.5]}`};
  padding-left: ${({ theme }) => `${theme.spacing[3]}`};
  background: linear-gradient(
    to right,
    transparent,
    ${({ theme }) => theme.color.muted} ${({ theme }) => theme.spacing[3]}
  );
  opacity: 0;
  transition: opacity 120ms;
  @media ${({ theme }) => theme.media.belowMd} { opacity: 1; position: static; transform: none; background: none; }
`

const TxnActionBtn = styled.button<{ $danger?: boolean }>`
  padding: ${({ theme }) => `${theme.spacing[1]}`};
  border-radius: ${({ theme }) => theme.radii.xs};
  border: none;
  background: none;
  cursor: pointer;
  color: ${({ theme }) => theme.color.mutedForeground};
  display: inline-flex;
  transition: background 120ms, color 120ms;
  &:hover {
    background: ${({ theme, $danger }) => $danger ? `color-mix(in srgb, ${theme.color.destructive} 12%, transparent)` : theme.color.muted};
    color: ${({ theme, $danger }) => $danger ? theme.color.destructive : theme.color.foreground};
  }
  ${focusRing}
`

const TxnAmount = styled.div<{ $color: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ $color }) => $color};
  white-space: nowrap;
`

/** The inline editor ignores the column grid — see the note at its call site. */
const TxnEditRow = styled(TxnRowRoot)`
  display: flex;
  @media ${({ theme }) => theme.media.belowMd} { display: flex; }
`

const InlineEditWrap = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  flex: 1;
  min-width: 0;
`

// ── List body styled ─────────────────────────────────────────────────────────

const TxnListWrap = styled.div`
  max-height: 560px;
  overflow-y: auto;
  padding-right: ${({ theme }) => `${theme.spacing[1]}`};
  outline: none;
`

const DayHeaderRoot = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[2]} ${theme.spacing[1]}`};
  margin-top: ${({ theme }) => `${theme.spacing[1]}`};
  background: ${({ theme }) => theme.color.card};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`

const DayHeaderLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const DayHeaderTotals = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[3]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-variant-numeric: tabular-nums;
`

// ── Transaction row ──────────────────────────────────────────────────────────

export function TransactionRow({
  txn, index, selected, active, compact, isEditing,
  onToggleSelect, onOpenModal, onStartEdit, onCancelEdit, onRecategorize, onAddTag, innerRef,
}: {
  txn: Txn
  index: number
  selected: boolean
  active: boolean
  compact: boolean
  isEditing: boolean
  onToggleSelect: (t: Txn, index: number, shift: boolean) => void
  onOpenModal: (t: Txn) => void
  onStartEdit: (t: Txn) => void
  onCancelEdit: () => void
  onRecategorize: (t: Txn) => void
  onAddTag: (t: Txn) => void
  innerRef: (el: HTMLElement | null) => void
}) {
  const queryClient = useQueryClient()
  const categoryLabel = useCategoryLabel(txn)
  const accountName = useAccountName(txn.account_id)
  const isTransfer = txn.type === 'transfer'
  const { iconBg, iconColor, amtColor, sign } = txnColors(txn.type)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [amt, setAmt] = useState(String(txn.amount))
  const [desc, setDesc] = useState(txn.description ?? '')

  useEffect(() => {
    if (isEditing) {
      setAmt(String(txn.amount))
      setDesc(txn.description ?? '')
    }
  }, [isEditing, txn.amount, txn.description])

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (txn.type === 'expense') return financeApi.deleteExpense(txn.id)
      if (txn.type === 'income') return financeApi.deleteIncome(txn.id)
      return financeApi.deleteTransfer(txn.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      toast.success('Transaction deleted')
    },
    onError: () => toast.error('Failed to delete transaction'),
  })

  const saveInline = useMutation({
    mutationFn: () => {
      const amount = parseFloat(amt)
      const patch = { amount, description: desc.trim() }
      if (txn.type === 'income') return financeApi.patchIncome(txn.id, patch)
      return financeApi.patchExpense(txn.id, patch)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      toast.success('Transaction updated')
      onCancelEdit()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Failed to update transaction'),
  })

  const amtValid = parseFloat(amt) > 0

  if (isEditing) {
    /* The editor takes the whole row rather than trying to fit the columns —
       an amount field inside a 116px cell is unusable. */
    return (
      <TxnEditRow ref={innerRef as any} $selected={selected} $active={active} $compact={compact}>
        <InlineEditWrap>
          <Input
            type="number" size="sm" startAdornment="₹" min="0" step="0.01" value={amt}
            /* The row is one line — there is no room for a message under the
               field, so the invalid state IS the message: red border plus
               aria-invalid for assistive tech, alongside the disabled tick. */
            invalid={!amtValid}
            aria-invalid={!amtValid}
            title={amtValid ? undefined : 'Enter an amount greater than zero'}
            onChange={e => setAmt(e.target.value)} style={{ width: 120, height: 32 }} aria-label="Edit amount"
            onKeyDown={e => { if (e.key === 'Enter' && amtValid) saveInline.mutate(); if (e.key === 'Escape') onCancelEdit() }}
            autoFocus
          />
          <Input
            size="sm" placeholder="Description" maxLength={200} value={desc}
            onChange={e => setDesc(e.target.value)} style={{ flex: 1, height: 32 }} aria-label="Edit description"
            onKeyDown={e => { if (e.key === 'Enter' && amtValid) saveInline.mutate(); if (e.key === 'Escape') onCancelEdit() }}
          />
          <TxnActionBtn onClick={() => amtValid && saveInline.mutate()} aria-label="Save" disabled={!amtValid || saveInline.isPending}>
            <Check size={15} />
          </TxnActionBtn>
          <TxnActionBtn onClick={onCancelEdit} aria-label="Cancel">
            <X size={15} />
          </TxnActionBtn>
        </InlineEditWrap>
      </TxnEditRow>
    )
  }

  return (
    <>
      <TxnRowRoot ref={innerRef as any} $selected={selected} $active={active} $compact={compact} data-row-index={index}>
        <RowCheck
          $show={selected}
          role="button"
          aria-label={selected ? 'Deselect transaction' : 'Select transaction'}
          onClick={(e) => { e.stopPropagation(); onToggleSelect(txn, index, e.shiftKey) }}
        >
          {/* Visual only — selection (incl. shift-range) is driven by the wrapper's
              onClick so we can read shiftKey, which a checkbox change event drops. */}
          <Checkbox size="sm" checked={selected} readOnly tabIndex={-1} aria-hidden />
        </RowCheck>
        <TxnDate>{dayjs(txn.logged_at).format('D MMM')}</TxnDate>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <TxnDesc>{txn.description || categoryLabel}</TxnDesc>
          {txn.split_group_id && (
            <span style={{ fontSize: 10, color: 'var(--primary)', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 2 }} title="Part of a split payment">
              <Split size={10} /> split
            </span>
          )}
        </div>

        <SecondaryCell>
          <CategoryChip $bg={iconBg} $color={iconColor} title={categoryLabel}>
            {getCategoryIcon(txn.category)}
            <span style={{ marginLeft: 5, overflow: 'hidden', textOverflow: 'ellipsis' }}>{categoryLabel}</span>
          </CategoryChip>
          {txn.tags && txn.tags.split(',').filter(Boolean).slice(0, 1).map(t => (
            <Badge key={t} style={{ marginLeft: 6 }}>{t}</Badge>
          ))}
        </SecondaryCell>

        <SecondaryCell title={accountName ?? undefined}>{accountName || '—'}</SecondaryCell>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 }}>
          <TxnAmount $color={amtColor}>
            {sign}{formatAmount(txn.amount)}
          </TxnAmount>
        </div>

        <TxnActions className="txn-actions">
            {!isTransfer && (
              <TxnActionBtn onClick={() => onStartEdit(txn)} aria-label="Quick edit" title="Quick edit amount & note">
                <PencilLine size={13} />
              </TxnActionBtn>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <TxnActionBtn aria-label="More actions" title="More actions">
                  <MoreHorizontal size={14} />
                </TxnActionBtn>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isTransfer && <DropdownMenuItem onSelect={() => onOpenModal(txn)}><PencilLine size={14} /> Edit details…</DropdownMenuItem>}
                {!isTransfer && <DropdownMenuItem onSelect={() => onRecategorize(txn)}><FolderInput size={14} /> Recategorize…</DropdownMenuItem>}
                {!isTransfer && <DropdownMenuItem onSelect={() => onAddTag(txn)}><TagIcon size={14} /> Add tag…</DropdownMenuItem>}
                {!isTransfer && <DropdownMenuSeparator />}
                <DropdownMenuItem destructive onSelect={() => setConfirmOpen(true)}><Trash2 size={14} /> Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </TxnActions>
      </TxnRowRoot>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete transaction?"
        description="This permanently removes the transaction and reverses its effect on the account balance."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  )
}

// ── Day / week group header ───────────────────────────────────────────────────

function GroupHeader({ label, income, expense }: { label: string; income: number; expense: number }) {
  return (
    <DayHeaderRoot>
      <DayHeaderLabel>{label}</DayHeaderLabel>
      <DayHeaderTotals>
        {income > 0 && <span style={{ color: 'var(--primary)', fontWeight: 600 }}>+{formatCurrency(income)}</span>}
        {expense > 0 && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>-{formatCurrency(expense)}</span>}
      </DayHeaderTotals>
    </DayHeaderRoot>
  )
}

// ── Shared list body (selection + keyboard + grouping) ────────────────────────

export function TxnListBody({
  txns, emptyText, grouping, sortBy, sortDir, compact,
  selected, editingKey, activeIndex, setActiveIndex,
  onToggleSelect, onOpenModal, onStartEdit, onCancelEdit, onRecategorize, onAddTag, onKeyNav,
}: {
  txns: Txn[]
  emptyText: string
  grouping: 'day' | 'week' | 'none'
  sortBy: SortBy
  sortDir: SortDir
  compact: boolean
  selected: Record<string, Txn>
  editingKey: string | null
  activeIndex: number
  setActiveIndex: (i: number) => void
  onToggleSelect: (t: Txn, index: number, shift: boolean) => void
  onOpenModal: (t: Txn) => void
  onStartEdit: (t: Txn) => void
  onCancelEdit: () => void
  onRecategorize: (t: Txn) => void
  onAddTag: (t: Txn) => void
  onKeyNav: (flat: Txn[]) => void
}) {
  const rowRefs = useRef<Map<number, HTMLElement>>(new Map())
  const model = useMemo(() => buildRenderModel(txns, grouping, sortBy, sortDir), [txns, grouping, sortBy, sortDir])

  // Expose the flat visible order upward so the header's select-all + keyboard
  // handler operate on exactly what's rendered.
  useEffect(() => { onKeyNav(model.flat) }, [model.flat, onKeyNav])

  useEffect(() => {
    if (activeIndex < 0) return
    rowRefs.current.get(activeIndex)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (txns.length === 0) return <EmptyState title={emptyText} />

  return (
    <TxnListWrap tabIndex={0} role="list" aria-label="Transactions">
      {model.items.map((item: any) => {
        if (item.kind === 'header') {
          return <GroupHeader key={`h:${item.key}`} label={item.label} income={item.income} expense={item.expense} />
        }
        const t: Txn = item.txn
        const k = keyOf(t)
        return (
          <TransactionRow
            key={k}
            txn={t}
            index={item.i}
            selected={!!selected[k]}
            active={activeIndex === item.i}
            compact={compact}
            isEditing={editingKey === k}
            onToggleSelect={onToggleSelect}
            onOpenModal={onOpenModal}
            onStartEdit={onStartEdit}
            onCancelEdit={onCancelEdit}
            onRecategorize={onRecategorize}
            onAddTag={onAddTag}
            innerRef={(el) => { if (el) rowRefs.current.set(item.i, el); else rowRefs.current.delete(item.i) }}
          />
        )
      })}
    </TxnListWrap>
  )
}
