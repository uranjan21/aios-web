import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Loader2, FileText, Sparkles, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
const FixedContainer = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 15vh 16px 16px;
  @media (min-width: 640px) { padding-top: 20vh; }
`

const BackdropMotion = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: ${({ theme }) => theme.color.overlay};
  backdrop-filter: blur(4px);
`

const PanelMotion = styled(motion.div)`
  position: relative;
  width: 100%;
  max-width: 576px;
  background: ${({ theme }) => theme.color.card};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radii['2xl']};
  box-shadow: ${({ theme }) => theme.shadow.xl};
  overflow: hidden;
`

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.muted}50;
`

const HeaderIconWrap = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: ${({ theme }) => theme.color.primary}14;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.color.primary};
  flex-shrink: 0;
`

const HeaderTitle = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.foreground};
`

const ShortcutRow = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const Kbd = styled.kbd`
  background: ${({ theme }) => theme.color.muted};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: 5px;
  padding: 1px 6px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 10px;
`

const Body = styled.div`
  padding: 16px;
`

const StyledTextarea = styled.textarea`
  width: 100%;
  resize: none;
  background: transparent;
  border: none;
  outline: none;
  color: ${({ theme }) => theme.color.foreground};
  font-size: 18px;
  font-family: inherit;
  line-height: 1.5;
  display: block;
  &::placeholder { color: ${({ theme }) => theme.color.mutedForeground}60; }
  @media (min-width: 640px) { font-size: 20px; }
`

const ParsedBanner = styled.div`
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.color.primary}40;
  background: ${({ theme }) => theme.color.primary}10;
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

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.muted}50;
`

const FooterHint = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.color.mutedForeground};
`

const InboxMoniker = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
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
  font-size: 14px;
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

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'l' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setCaptureModalOpen(!captureModalOpen) }
      if (e.key === 'Escape' && captureModalOpen) setCaptureModalOpen(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [captureModalOpen, setCaptureModalOpen])

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
    <AnimatePresence>
      {captureModalOpen && (
        <FixedContainer>
          <BackdropMotion
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setCaptureModalOpen(false)}
            aria-hidden="true"
          />
          <PanelMotion
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            role="dialog" aria-modal="true" aria-label="Global capture"
          >
            <PanelHeader>
              <HeaderIconWrap><FileText size={14} /></HeaderIconWrap>
              <HeaderTitle>Quick Capture</HeaderTitle>
              <ShortcutRow>
                <Kbd>⌘L</Kbd>
                <span>to open</span>
              </ShortcutRow>
            </PanelHeader>

            <Body>
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
            </Body>

            <Footer>
              <FooterHint>
                {parsed
                  ? 'Confirm to log it where it belongs'
                  : <>AI parses it — notes fall back to<InboxMoniker>inbox.md</InboxMoniker></>
                }
              </FooterHint>
              <SaveBtn onClick={handleSubmit} disabled={isPending || !text.trim()}>
                {isPending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : parsed ? <Check size={16} /> : <Send size={16} />}
                {parsed ? 'Confirm' : 'Save'}
              </SaveBtn>
            </Footer>
          </PanelMotion>
        </FixedContainer>
      )}
    </AnimatePresence>
  )
}
