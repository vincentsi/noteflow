'use client'

import { FileText, MessageSquare, List, ListOrdered, Trophy, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SummaryStyle = 'SHORT' | 'TWEET' | 'THREAD' | 'BULLET_POINT' | 'TOP3' | 'MAIN_POINTS'

export interface StyleSelectorProps {
  value: SummaryStyle
  onChange: (style: SummaryStyle) => void
}

interface StyleOption {
  value: SummaryStyle
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const styleOptions: StyleOption[] = [
  {
    value: 'SHORT',
    label: 'SHORT',
    icon: FileText,
    description: 'Résumé court en 2-3 phrases',
  },
  {
    value: 'TWEET',
    label: 'TWEET',
    icon: MessageSquare,
    description: 'Format Twitter (280 caractères)',
  },
  {
    value: 'THREAD',
    label: 'THREAD',
    icon: List,
    description: 'Thread Twitter en plusieurs tweets',
  },
  {
    value: 'BULLET_POINT',
    label: 'BULLET_POINT',
    icon: ListOrdered,
    description: 'Points clés à puces',
  },
  {
    value: 'TOP3',
    label: 'TOP3',
    icon: Trophy,
    description: 'Top 3 des points essentiels',
  },
  {
    value: 'MAIN_POINTS',
    label: 'MAIN_POINTS',
    icon: Target,
    description: 'Tous les points principaux',
  },
]

export function StyleSelector({ value, onChange }: StyleSelectorProps) {
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
                {option.label}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{option.description}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
