import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Loader2, Sparkles, Check } from 'lucide-react'
import { Dialog } from '@ledgr/ui'
import { toast } from 'sonner'
import styled from 'styled-components'
import { capturesApi, financeApi, healthApi, type ParsedCapture } from '@/api/areas'
import { useUIStore } from '@/stores/uiStore'

const DOMAIN_LABELS: Record<ParsedCapture['domain'], string> = {
  finance_expense: '💸 Expense',
  finance_income: '💰 Income',
  health_meal: '🍽️ Meal',
  health_water: '💧 Water',
  health_weight: '⚖️ Weight',
  health_gym: '🏋️ Gym session',
  capture: '📝 Note',
}

async function executeParsed(p: ParsedCapture, rawText: string): Promise<string> {
  const f = p.fields
  switch (p.domain) {
    case 'finance_expense':
      await financeApi.createExpense({ amount: Number(f.amount), category: f.category || 'Other', description: f.description || rawText })
      return 'Expense logged'
    case 'finance_income':
      await financeApi.createIncome({ amount: Number(f.amount), source: f.source || 'other', description: f.description || rawText })
      return 'Income logged'
    case 'health_meal':
      await healthApi.logMeal({ food_name: f.food_name || rawText, calories: Number(f.calories) || 0, protein: f.protein ? Number(f.protein) : undefined })
      return 'Meal logged'
    case 'health_water':
      await healthApi.createLog({ entry_type: 'water', value: Number(f.litres) || 0, unit: 'L' })
      return 'Water logged'
    case 'health_weight':
      await healthApi.createLog({ entry_type: 'weight', value: Number(f.kg) || 0, unit: 'kg' })
      return 'Weight logged'
    case 'health_gym':
      await healthApi.createLog({ entry_type: 'gym', notes: f.notes || rawText })
      return 'Gym session logged'
    default:
      await capturesApi.create(rawText)
      return 'Saved to inbox'
  }
}

/* ── Styled components ──────────────────────────────────────────────── */

const StyledTextarea = styled.textarea`
  width: 100%;
  resize: none;
  background: transparent;
  border: none;
  outline: none;
  color: ${({ theme }) => theme.color.foreground};
  font-size: 17px;
  font-family: inherit;
  line-height: 1.55;
  display: block;
  &::placeholder { color: ${({ theme }) => theme.color.mutedForeground}55; }
`

const ParsedBanner = styled.div`
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.color.primary}40;
  background: ${({ theme }) => theme.color.primary}0D;
`

const ParsedInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 12px;
  color: ${({ theme }) => theme.color.foreground};
`

const SaveAsNoteBtn = styled.button`
  font-size: 11px;
  color: ${({ theme }) => theme.color.mutedForeground};
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  padding: 0;
  &:hover { color: ${({ theme }) => theme.color.foreground}; }
`

const CaptureActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.color.border};
`

const FooterHint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const InboxMoniker = styled.code`
  background: ${({ theme }) => theme.color.muted};
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 4px;
  font-size: 11px;
`

const SaveBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 13.5px;
  font-weight: 500;
  background: ${({ theme }) => theme.color.primary};
  color: ${({ theme }) => theme.color.primaryForeground};
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 120ms;
  &:hover { background: ${({ theme }) => theme.color.primaryHover}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.ring}; outline-offset: 2px; }
`

export function GlobalCapture() {
  const { captureModalOpen, setCaptureModalOpen } = useUIStore()
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedCapture | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()

  // ⌘L to toggle — reads current state directly to avoid stale closure
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'l' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCaptureModalOpen(!useUIStore.getState().captureModalOpen)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [setCaptureModalOpen])

  // Focus textarea on open; reset on close
  useEffect(() => {
    if (captureModalOpen) setTimeout(() => inputRef.current?.focus(), 50)
    else { setText(''); setParsed(null) }
  }, [captureModalOpen])

  const parseMutation = useMutation({
    mutationFn: (t: string) => capturesApi.parse(t),
    onSuccess: (result) => {
      if (result.domain === 'capture') confirmMutation.mutate(result)
      else setParsed(result)
    },
    onError: () => confirmMutation.mutate({ domain: 'capture', fields: {}, summary: '' }),
  })

  const confirmMutation = useMutation({
    mutationFn: (p: ParsedCapture) => executeParsed(p, text.trim()),
    onSuccess: (msg) => {
      toast.success(msg)
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
      queryClient.invalidateQueries({ queryKey: ['captures'] })
      setCaptureModalOpen(false); setText(''); setParsed(null)
    },
    onError: () => toast.error('Failed to save — kept your text, try again'),
  })

  const isPending = parseMutation.isPending || confirmMutation.isPending
  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || isPending) return
    if (parsed) confirmMutation.mutate(parsed)
    else parseMutation.mutate(trimmed)
  }

  return (
    <Dialog
      open={captureModalOpen}
      onOpenChange={setCaptureModalOpen}
      title="Quick Capture"
      description="Type anything — AI routes it to finance, health, or your inbox."
      size="md"
    >
      <StyledTextarea
        ref={inputRef}
        value={text}
        onChange={e => { setText(e.target.value); setParsed(null) }}
        placeholder="spent 450 on groceries · weight 81.2 · drank 2L water…"
        rows={4}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
      />

      {parsed && (
        <ParsedBanner>
          <ParsedInfo>
            <Sparkles size={14} color="inherit" style={{ flexShrink: 0 }} />
            <span><strong>{DOMAIN_LABELS[parsed.domain]}</strong> — {parsed.summary}</span>
          </ParsedInfo>
          <SaveAsNoteBtn onClick={() => confirmMutation.mutate({ domain: 'capture', fields: {}, summary: '' })}>
            Save as note instead
          </SaveAsNoteBtn>
        </ParsedBanner>
      )}

      <CaptureActions>
        <FooterHint>
          {parsed
            ? 'Confirm to log it where it belongs'
            : <>AI parses it — notes fall back to<InboxMoniker>inbox.md</InboxMoniker></>
          }
        </FooterHint>
        <SaveBtn onClick={handleSubmit} disabled={isPending || !text.trim()}>
          {isPending
            ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
            : parsed ? <Check size={15} /> : <Send size={15} />
          }
          {parsed ? 'Confirm' : 'Save'}
        </SaveBtn>
      </CaptureActions>
    </Dialog>
  )
}
