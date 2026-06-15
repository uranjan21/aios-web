import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TextTabOption {
  label: ReactNode
  value: string
}

interface TextTabsProps {
  options: (string | TextTabOption)[]
  value: string
  onChange: (value: string) => void
  block?: boolean
  className?: string
}

/** Minimal tab switch — plain text labels with a thin underline on the active item. */
export function TextTabs({ options, value, onChange, block, className }: TextTabsProps) {
  const items = options.map(o => (typeof o === 'string' ? { label: o, value: o } : o))

  return (
    <div className={cn('flex items-center gap-4 border-b border-border/60', block && 'gap-0', className)}>
      {items.map(item => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={cn(
            'relative pb-2 text-[12px] font-medium whitespace-nowrap transition-colors',
            block && 'flex-1 text-center',
            value === item.value ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {item.label}
          {value === item.value && (
            <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-primary rounded-full" />
          )}
        </button>
      ))}
    </div>
  )
}
