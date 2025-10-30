'use client'

import { FileText, MessageSquare, List, ListOrdered, Trophy, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/provider'

export type SummaryStyle = 'SHORT' | 'TWEET' | 'THREAD' | 'BULLET_POINT' | 'TOP3' | 'MAIN_POINTS'

export interface StyleSelectorProps {
  value: SummaryStyle
  onChange: (style: SummaryStyle) => void
}

interface StyleOption {
  value: SummaryStyle
  icon: React.ComponentType<{ className?: string }>
}

const styleOptions: StyleOption[] = [
  {
    value: 'SHORT',
    icon: FileText,
  },
  {
    value: 'TWEET',
    icon: MessageSquare,
  },
  {
    value: 'THREAD',
    icon: List,
  },
  {
    value: 'BULLET_POINT',
    icon: ListOrdered,
  },
  {
    value: 'TOP3',
    icon: Trophy,
  },
  {
    value: 'MAIN_POINTS',
    icon: Target,
  },
]

export function StyleSelector({ value, onChange }: StyleSelectorProps) {
  const { t } = useI18n()

  const handleSelect = (style: SummaryStyle) => {
    if (style !== value) {
      onChange(style)
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {styleOptions.map((option) => {
        const Icon = option.icon
        const isSelected = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={cn(
              'flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all',
              'hover:border-primary/50 hover:bg-accent/50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border bg-background'
            )}
            aria-pressed={isSelected}
          >
            <Icon className={cn('h-6 w-6', isSelected ? 'text-primary' : 'text-muted-foreground')} />
            <div className="text-center">
              <div className={cn('font-medium text-sm', isSelected ? 'text-primary' : 'text-foreground')}>
                {t(`summaries.styles.${option.value}`)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t(`summaries.styleDescriptions.${option.value}`)}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
