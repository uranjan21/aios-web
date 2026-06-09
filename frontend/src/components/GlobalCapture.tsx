import { useEffect, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Plus, Send, Loader2, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { capturesApi } from '@/api/areas'
import { useUIStore } from '@/stores/uiStore'

export function GlobalCapture() {
  const { captureModalOpen, setCaptureModalOpen } = useUIStore()
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

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
    }
  }, [captureModalOpen])

  const { mutate, isPending } = useMutation({
    mutationFn: (text: string) => capturesApi.create(text),
    onSuccess: () => {
      setCaptureModalOpen(false)
      setText('')
    },
    // We swallow errors here or show a quick toast if desired, but
    // usually we don't want to break the flow. In a real app we'd queue offline.
  })

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    mutate(trimmed)
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
            className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Global capture"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
              <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 text-primary" />
              </div>
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
                onChange={e => setText(e.target.value)}
                placeholder="Log an expense, workout, or thought…"
                rows={4}
                className="w-full resize-none bg-transparent outline-none text-foreground placeholder:text-muted-foreground/60 text-lg sm:text-xl"
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit()
                  }
                }}
              />
            </div>

            <div className="px-4 py-3 border-t border-border bg-muted/30 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Sent to vault <span className="font-mono bg-muted px-1 py-0.5 rounded ml-1">inbox.md</span>
              </span>
              <button
                onClick={handleSubmit}
                disabled={isPending || !text.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Save
                <kbd className="hidden sm:inline-block ml-2 text-[10px] text-primary-foreground/70 font-mono">↵</kbd>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
