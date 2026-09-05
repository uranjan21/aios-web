import { focusRing } from '@ledgr/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import { ChevronRight, ChevronLeft, Plus, Check } from 'lucide-react'
import { toast } from 'sonner'
import { FieldError, useFieldErrors } from '@ct/shared/components/forms/fieldErrors'
import { financeApi } from '@ct/shared/api/areas'

export type Cat = { id: string; name: string; kind?: string; parent_id?: string | null; icon?: string | null }

// ── styled ──────────────────────────────────────────────────────────────────
const Trigger = styled.button<{ $placeholder: boolean; $invalid?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => `${theme.spacing[2]}`};
  height: 38px;
  padding: ${({ theme }) => `0 ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme, $invalid }) => ($invalid ? theme.color.destructive : theme.color.border)};
  color: ${({ theme, $placeholder }) => ($placeholder ? theme.color.mutedForeground : theme.color.foreground)};
  font-size: 0.875rem;
  cursor: pointer;
  text-align: left;
  ${focusRing}
  & svg { width: 15px; height: 15px; flex-shrink: 0; color: ${({ theme }) => theme.color.mutedForeground}; }
  .val { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`

const Panel = styled.div`
  position: fixed;
  z-index: ${({ theme }) => theme.zIndex.popover + 1};
  /* This is a hand-rolled flyout standing in for a Popover, so it has to
     match one: glass tokens + elevation[3] + radii.md, same as
     PopoverContent and the Select surface. It was a solid color.popover
     panel on the legacy shadow scale with the surface corner one step too
     large. */
  background: ${({ theme }) => theme.glass.background};
  backdrop-filter: ${({ theme }) => theme.glass.thick};
  -webkit-backdrop-filter: ${({ theme }) => theme.glass.thick};
  border: 1px solid ${({ theme }) => theme.mode === 'dark' ? theme.glass.borderStrong : theme.color.border};
  border-radius: ${({ theme }) => theme.radii.md};
  box-shadow: ${({ theme }) => theme.elevation[3]};
  padding: ${({ theme }) => `${theme.spacing[1.5]}`};
  width: 248px;
  max-height: 320px;
  overflow-y: auto;
`

const Row = styled.button<{ $muted?: boolean; $accent?: boolean; $active?: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[2.5]}`};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  /* Row inside a surface - sm, matching Select's Item and DropdownMenu's. */
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  text-align: left;
  background: ${({ theme, $active }) => ($active ? theme.color.muted : 'transparent')};
  color: ${({ theme, $muted, $accent }) =>
    $accent ? theme.color.primary : $muted ? theme.color.mutedForeground : theme.color.foreground};
  cursor: pointer;
  &:hover { background: ${({ theme }) => theme.color.muted}; }
  & > .ico { width: 18px; text-align: center; flex-shrink: 0; }
  & > .lbl { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  & > svg { width: 15px; height: 15px; flex-shrink: 0; color: ${({ theme }) => theme.color.mutedForeground}; }
`

const Divider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.color.border};
  margin: ${({ theme }) => `${theme.spacing[1]} 0`};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  padding: ${({ theme }) => `${theme.spacing[1.5]} ${theme.spacing[2]}`};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const InlineCreate = styled.div`
  display: flex;
  gap: ${({ theme }) => `${theme.spacing[1.5]}`};
  padding: ${({ theme }) => `${theme.spacing[1.5]}`};
  & input {
    flex: 1;
    height: 32px;
    padding: ${({ theme }) => `0 ${theme.spacing[2.5]}`};
    border-radius: ${({ theme }) => theme.radii.md};
    border: 1px solid ${({ theme }) => theme.color.border};
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    background: ${({ theme }) => theme.color.card};
    color: ${({ theme }) => theme.color.foreground};
  }
`

// ── component ───────────────────────────────────────────────────────────────
export function CategoryPicker({
  value, onChange, kind, categories, label = 'Category', invalid,
}: {
  value?: string
  onChange: (categoryId: string) => void
  kind: 'expense' | 'income'
  categories: Cat[]
  label?: string
  invalid?: boolean
}) {
  const queryClient = useQueryClient()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [drillParent, setDrillParent] = useState<string | null>(null) // mobile / active submenu
  const [pos, setPos] = useState({ top: 0, left: 0, width: 248 })
  const [creating, setCreating] = useState<{ parentId: string | null } | null>(null)
  const f = useFieldErrors<'name'>('category-picker')
  const [draft, setDraft] = useState('')
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 560

  const kindCats = useMemo(() => categories.filter(c => (c.kind || 'expense') === kind), [categories, kind])
  const tops = useMemo(() => kindCats.filter(c => !c.parent_id), [kindCats])
  const childrenOf = (id: string) => kindCats.filter(c => c.parent_id === id)
  const byId = (id?: string) => kindCats.find(c => c.id === id)

  // Selected label: "Parent › Sub" or "Parent"
  const selectedLabel = useMemo(() => {
    const sel = byId(value)
    if (!sel) return null
    if (sel.parent_id) {
      const parent = byId(sel.parent_id)
      return `${parent?.icon ? parent.icon + ' ' : ''}${parent?.name ?? ''} › ${sel.name}`
    }
    return `${sel.icon ? sel.icon + ' ' : ''}${sel.name}`
  }, [value, kindCats])

  useEffect(() => {
    if (!open || !triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 248) })
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node) || triggerRef.current?.contains(e.target as Node)) return
      close()
    }
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc) }
  }, [open])

  const close = () => { setOpen(false); setDrillParent(null); setCreating(null); setDraft(''); f.reset() }

  const createMutation = useMutation({
    mutationFn: (vars: { name: string; parent_id: string | null }) =>
      financeApi.createCategory({ name: vars.name, kind, parent_id: vars.parent_id, icon: null }),
    onSuccess: (cat: any) => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'categories'] })
      setCreating(null); setDraft(''); f.reset()
      onChange(cat.id)               // auto-select the new category
      if (!cat.parent_id) setDrillParent(cat.id)  // a new top-level → open it to add subs
      else close()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail || 'Could not create category'),
  })

  /* An empty name used to return silently — the tick did nothing and said
     nothing. The reason now appears under the field it belongs to. */
  const submitCreate = () => {
    const name = draft.trim()
    if (!creating) return
    if (!f.submit({ name: name ? undefined : 'Type a name first.' })) return
    createMutation.mutate({ name, parent_id: creating.parentId })
  }

  const pick = (id: string) => { onChange(id); close() }

  // Root list (top-level categories)
  const rootView = (
    <>
      {tops.length === 0 && <Header>No {kind} categories yet</Header>}
      {tops.map(t => (
        <Row key={t.id} type="button" $active={drillParent === t.id} onClick={() => setDrillParent(t.id)}>
          <span className="ico">{t.icon || ''}</span>
          <span className="lbl">{t.name}</span>
          <ChevronRight />
        </Row>
      ))}
      <Divider />
      {creating?.parentId === null ? (
        <>
        <InlineCreate>
          <input autoFocus placeholder="New category name" value={draft}
            aria-invalid={f.fieldProps('name').invalid}
            aria-describedby={f.fieldProps('name')['aria-describedby']}
            onChange={e => { f.clearField('name'); setDraft(e.target.value) }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitCreate() } }} />
          <Row as="button" type="button" $accent style={{ width: 'auto' }} onClick={submitCreate}><Check /></Row>
        </InlineCreate>
        <FieldError id={f.errorId('name')}>{f.errors.name}</FieldError>
        </>
      ) : (
        <Row type="button" $accent onClick={() => { setCreating({ parentId: null }); setDraft('') }}>
          <Plus /><span className="lbl">New category</span>
        </Row>
      )}
    </>
  )

  // Submenu for a parent: "use parent only" + subcategories + add-subcategory
  const drillView = (parentId: string) => {
    const parent = byId(parentId)
    const kids = childrenOf(parentId)
    return (
      <>
        <Header>
          <button type="button" aria-label="Back" onClick={() => setDrillParent(null)}
            style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
            <ChevronLeft size={15} />
          </button>
          {parent?.icon ? parent.icon + ' ' : ''}{parent?.name}
        </Header>
        <Row type="button" $muted $active={value === parentId} onClick={() => pick(parentId)}>
          <Check style={{ opacity: value === parentId ? 1 : 0 }} />
          <span className="lbl">Use “{parent?.name}” only</span>
        </Row>
        <Divider />
        {kids.map(k => (
          <Row key={k.id} type="button" $active={value === k.id} onClick={() => pick(k.id)}>
            <span className="ico">{k.icon || ''}</span>
            <span className="lbl">{k.name}</span>
            {value === k.id && <Check />}
          </Row>
        ))}
        <Divider />
        {creating?.parentId === parentId ? (
          <>
          <InlineCreate>
            <input autoFocus placeholder="New subcategory" value={draft}
              aria-invalid={f.fieldProps('name').invalid}
              aria-describedby={f.fieldProps('name')['aria-describedby']}
              onChange={e => { f.clearField('name'); setDraft(e.target.value) }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitCreate() } }} />
            <Row as="button" type="button" $accent style={{ width: 'auto' }} onClick={submitCreate}><Check /></Row>
          </InlineCreate>
          <FieldError id={f.errorId('name')}>{f.errors.name}</FieldError>
          </>
        ) : (
          <Row type="button" $accent onClick={() => { setCreating({ parentId }); setDraft('') }}>
            <Plus /><span className="lbl">Add subcategory</span>
          </Row>
        )}
      </>
    )
  }

  return (
    <>
      <Trigger ref={triggerRef} type="button" $placeholder={!selectedLabel} $invalid={invalid}
        aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span className="val">{selectedLabel || `Select ${label.toLowerCase()}`}</span>
        <ChevronRight style={{ transform: 'rotate(90deg)' }} />
      </Trigger>
      {open && createPortal(
        <div ref={panelRef}>
          <Panel style={{ top: pos.top, left: pos.left, width: pos.width }}>
            {isMobile && drillParent ? drillView(drillParent) : rootView}
          </Panel>
          {!isMobile && drillParent && (
            <Panel style={{ top: pos.top, left: pos.left + pos.width + 6, width: 248 }}>
              {drillView(drillParent)}
            </Panel>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
