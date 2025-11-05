'use client'

import { FileText, MessageSquare, List, ListOrdered, Trophy, Target, GraduationCap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/provider'

export type SummaryStyle = 'SHORT' | 'TWEET' | 'THREAD' | 'BULLET_POINT' | 'TOP3' | 'MAIN_POINTS' | 'EDUCATIONAL'

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
  {
    value: 'EDUCATIONAL',
    icon: GraduationCap,
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
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {styleOptions.map((option) => {
        const Icon = option.icon
        const isSelected = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={cn(
              'flex flex-col items-center gap-2 p-4 rounded-md border transition-all duration-150',
              'hover:border-primary hover:-translate-y-0.5',
              'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20',
              isSelected
                ? 'border-primary bg-background'
                : 'border-border bg-background'
            )}
            aria-pressed={isSelected}
          >
            <Icon className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-foreground')} />
            <div className="text-center">
              <div className={cn('font-medium text-sm', isSelected ? 'text-foreground' : 'text-foreground')}>
                {t(`summaries.styles.${option.value}`)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {t(`summaries.styleDescriptions.${option.value}`)}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
