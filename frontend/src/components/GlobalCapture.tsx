import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Loader2, FileText, Sparkles, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { capturesApi, financeApi, healthApi, type ParsedCapture } from '@/api/areas'
import { useUIStore } from '@/stores/uiStore'
import { IconBadge } from '@/components/lumina'

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

export function GlobalCapture() {
  const { captureModalOpen, setCaptureModalOpen } = useUIStore()
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedCapture | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()

  // Toggle on ⌘L
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'l' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCaptureModalOpen(!captureModalOpen)
      }
      if (e.key === 'Escape' && captureModalOpen) {
        setCaptureModalOpen(false)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [captureModalOpen, setCaptureModalOpen])

  // Focus when opened
  useEffect(() => {
    if (captureModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setText('')
      setParsed(null)
    }
  }, [captureModalOpen])

  const parseMutation = useMutation({
    mutationFn: (t: string) => capturesApi.parse(t),
    onSuccess: (result) => {
      if (result.domain === 'capture') {
        // Nothing structured detected — save straight to inbox
        confirmMutation.mutate(result)
      } else {
        setParsed(result)
      }
    },
    onError: () => {
      // Parse unavailable — degrade gracefully to plain capture
      confirmMutation.mutate({ domain: 'capture', fields: {}, summary: '' })
    },
  })

  const confirmMutation = useMutation({
    mutationFn: (p: ParsedCapture) => executeParsed(p, text.trim()),
    onSuccess: (msg) => {
      toast.success(msg)
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      queryClient.invalidateQueries({ queryKey: ['health'] })
      setCaptureModalOpen(false)
      setText('')
      setParsed(null)
    },
    onError: () => toast.error('Failed to save — kept your text, try again'),
  })

  const isPending = parseMutation.isPending || confirmMutation.isPending

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || isPending) return
    if (parsed) {
      confirmMutation.mutate(parsed)
    } else {
      parseMutation.mutate(trimmed)
    }
  }

  return (
    <AnimatePresence>
      {captureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh] p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setCaptureModalOpen(false)}
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-xl bg-card border-0 rounded-2xl shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Global capture"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
              <IconBadge icon={FileText} color="primary" size="sm" />
              <span className="text-sm font-semibold text-foreground">Quick Capture</span>
              <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted">⌘L</kbd>
                <span>to open</span>
              </div>
            </div>

            <div className="p-4">
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => { setText(e.target.value); setParsed(null) }}
                placeholder="spent 450 on groceries · weight 81.2 · drank 2L water…"
                rows={4}
                className="w-full resize-none bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60 text-lg sm:text-xl"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
              />
              {parsed && (
                <div className="mt-2 flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-primary/40 bg-primary/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-[12px] text-foreground truncate">
                      <span className="font-semibold">{DOMAIN_LABELS[parsed.domain]}</span> — {parsed.summary}
                    </span>
                  </div>
                  <button
                    onClick={() => confirmMutation.mutate({ domain: 'capture', fields: {}, summary: '' })}
                    className="text-[11px] text-muted-foreground hover:text-foreground shrink-0"
                  >
                    Save as note instead
                  </button>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {parsed ? 'Confirm to log it where it belongs' : <>AI parses it — notes fall back to <span className="font-mono bg-muted px-1 py-0.5 rounded ml-1">inbox.md</span></>}
              </span>
              <button
                onClick={handleSubmit}
                disabled={isPending || !text.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : parsed ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {parsed ? 'Confirm' : 'Save'}
                <kbd className="hidden sm:inline-block ml-2 text-[10px] text-primary-foreground/70 font-mono">↵</kbd>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
