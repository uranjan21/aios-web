import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Input, EmptyState, Badge, Checkbox,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  ConfirmDialog } from '@ledgr/ui'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { PencilLine, Trash2, Check, X, Tag as TagIcon, FolderInput, MoreHorizontal, Split } from 'lucide-react'
import { financeApi } from '@aios/shared/api/areas'
import { formatCurrency } from '@aios/shared/lib/utils'
import styled from 'styled-components'

import type { Txn, SortBy, SortDir } from './types'
import { keyOf, buildRenderModel, getCategoryIcon, txnColors, useCategoryLabel, useAccountName } from './utils'

// ── Transaction row styled ───────────────────────────────────────────────────

export const TxnRowRoot = styled.div<{ $selected: boolean; $active: boolean; $compact: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: ${({ $compact }) => ($compact ? '5px 8px' : '9px 8px')};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  &:last-child { border-bottom: none; }
  position: relative;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme, $selected }) => $selected ? `color-mix(in srgb, ${theme.color.primary} 6%, transparent)` : 'transparent'};
  box-shadow: ${({ theme, $active }) => $active ? `inset 0 0 0 1.5px ${theme.color.primary}` : 'none'};
  transition: background 100ms ease;
  &:hover { background: ${({ theme, $selected }) => $selected ? `color-mix(in srgb, ${theme.color.primary} 9%, transparent)` : theme.color.muted}; }
  &:hover .txn-actions { opacity: 1; }
`

const RowCheck = styled.div<{ $show: boolean }>`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  opacity: ${({ $show }) => ($show ? 1 : 0)};
  transition: opacity 100ms ease;
  ${TxnRowRoot}:hover & { opacity: 1; }
`

const TxnLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
`

const TxnIconWrap = styled.div<{ $bg: string; $color: string; $compact: boolean }>`
  flex-shrink: 0;
  width: ${({ $compact }) => ($compact ? '26px' : '32px')};
  height: ${({ $compact }) => ($compact ? '26px' : '32px')};
  border-radius: 50%;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  display: flex;
  align-items: center;
  justify-content: center;
`

const TxnDesc = styled.span`
  font-size: 12.5px;
  font-weight: 500;
  color: ${({ theme }) => theme.color.foreground};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const TxnMeta = styled.div`
  font-size: 10.5px;
  color: ${({ theme }) => theme.color.mutedForeground};
  display: flex;
  align-items: center;
  gap: 5px;
  overflow: hidden;
  white-space: nowrap;
`

const MetaDot = styled.span`
  opacity: 0.5;
`

const AccountChip = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radii.xs};
  background: ${({ theme }) => theme.color.muted};
  color: ${({ theme }) => theme.color.mutedForeground};
  font-size: 10px;
  font-weight: 500;
  flex-shrink: 0;
`

const TxnRight = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  margin-left: 8px;
`

const TxnActions = styled.div`
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 120ms;
  @media (max-width: 768px) { opacity: 1; }
`

const TxnActionBtn = styled.button<{ $danger?: boolean }>`
  padding: 5px;
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
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.primary}; outline-offset: 1px; }
`

const TxnAmount = styled.div<{ $color: string }>`
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: ${({ $color }) => $color};
  white-space: nowrap;
`

const InlineEditWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
`

// ── List body styled ─────────────────────────────────────────────────────────

const TxnListWrap = styled.div`
  max-height: 560px;
  overflow-y: auto;
  padding-right: 4px;
  outline: none;
`

const DayHeaderRoot = styled.div`
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 8px 5px;
  margin-top: 4px;
  background: ${({ theme }) => theme.color.card};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
`

const DayHeaderLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const DayHeaderTotals = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
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
    return (
      <TxnRowRoot ref={innerRef as any} $selected={selected} $active={active} $compact={compact}>
        <TxnIconWrap $bg={iconBg} $color={iconColor} $compact={compact}>{getCategoryIcon(txn.category)}</TxnIconWrap>
        <InlineEditWrap>
          <Input
            type="number" size="sm" startAdornment="₹" min="0" step="0.01" value={amt}
            onChange={e => setAmt(e.target.value)} style={{ width: 120, height: 32 }} aria-label="Edit amount"
            onKeyDown={e => { if (e.key === 'Enter' && amtValid) saveInline.mutate(); if (e.key === 'Escape') onCancelEdit() }}
            autoFocus
          />
          <Input
            size="sm" placeholder="Description" maxLength={200} value={desc}
            onChange={e => setDesc(e.target.value)} style={{ flex: 1, height: 32 }} aria-label="Edit description"
            onKeyDown={e => { if (e.key === 'Enter' && amtValid) saveInline.mutate(); if (e.key === 'Escape') onCancelEdit() }}
          />
        </InlineEditWrap>
        <TxnRight>
          <TxnActionBtn onClick={() => amtValid && saveInline.mutate()} aria-label="Save" disabled={!amtValid || saveInline.isPending}>
            <Check size={15} />
          </TxnActionBtn>
          <TxnActionBtn onClick={onCancelEdit} aria-label="Cancel">
            <X size={15} />
          </TxnActionBtn>
        </TxnRight>
      </TxnRowRoot>
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
        <TxnLeft>
          <TxnIconWrap $bg={iconBg} $color={iconColor} $compact={compact}>
            {getCategoryIcon(txn.category)}
          </TxnIconWrap>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <TxnDesc>{txn.description || categoryLabel}</TxnDesc>
              {txn.split_group_id && (
                <span style={{ fontSize: 10, color: 'var(--primary)', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 2 }} title="Part of a split payment">
                  <Split size={10} /> split
                </span>
              )}
            </div>
            <TxnMeta>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{categoryLabel}</span>
              <MetaDot>·</MetaDot>
              <span>{dayjs(txn.logged_at).format('MMM D, h:mm A')}</span>
              {accountName && <AccountChip>{accountName}</AccountChip>}
              {txn.tags && txn.tags.split(',').filter(Boolean).slice(0, 2).map(t => (
                <Badge key={t}>{t}</Badge>
              ))}
            </TxnMeta>
          </div>
        </TxnLeft>
        <TxnRight>
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
          <TxnAmount $color={amtColor}>
            {sign}{formatCurrency(txn.amount)}
          </TxnAmount>
        </TxnRight>
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
