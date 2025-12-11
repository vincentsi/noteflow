'use client'

import { FileText, MessageSquare, List, ListOrdered, Trophy, Target, GraduationCap, Sparkles, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/provider'
import { useAuth } from '@/providers/auth.provider'
import { useQuery } from '@tanstack/react-query'
import { templatesApi } from '@/lib/api/templates'
import type { SummaryTemplate } from '@/lib/api/templates'
import Link from 'next/link'

export type SummaryStyle = 'SHORT' | 'TWEET' | 'THREAD' | 'BULLET_POINT' | 'TOP3' | 'MAIN_POINTS' | 'EDUCATIONAL'

export interface StyleSelectorProps {
  value: SummaryStyle | string
  onChange: (styleOrTemplateId: SummaryStyle | string) => void
  selectedTemplateId?: string | null
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

export function StyleSelector({ value, onChange, selectedTemplateId }: StyleSelectorProps) {
  const { t } = useI18n()
  const { isAuthenticated } = useAuth()

  // Fetch templates if authenticated
  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.getTemplates(),
    enabled: isAuthenticated,
  })

  const templates = templatesData?.data.templates?.filter((t: SummaryTemplate) => !t.isDefault) || []

  const handleSelect = (styleOrTemplateId: SummaryStyle | string) => {
    onChange(styleOrTemplateId)
  }

  return (
    <div className="space-y-4">
      {/* Default Styles */}
      <div>
        <h3 className="text-sm font-medium mb-3">{t('summaries.form.defaultStyles')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {styleOptions.map((option) => {
            const Icon = option.icon
            const isSelected = !selectedTemplateId && value === option.value

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
      </div>

      {/* Custom Templates */}
      {isAuthenticated && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">{t('summaries.form.customTemplates')}</h3>
            <Link
              href="/templates"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Settings className="h-3 w-3" />
              {t('summaries.form.manageTemplates')}
            </Link>
          </div>
          {templates.length === 0 ? (
            <div className="text-center py-6 border border-dashed rounded-md">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">{t('summaries.form.noTemplates')}</p>
              <Link
                href="/templates"
                className="text-sm text-primary hover:underline"
              >
                {t('summaries.form.createFirstTemplate')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {templates.map((template: SummaryTemplate) => {
                const isSelected = selectedTemplateId === template.id

                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelect(template.id)}
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
                    {template.icon ? (
                      <span className="text-2xl">{template.icon}</span>
                    ) : (
                      <Sparkles className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-foreground')} />
                    )}
                    <div className="text-center">
                      <div className={cn('font-medium text-sm', isSelected ? 'text-foreground' : 'text-foreground')}>
                        {template.name}
                      </div>
                      {template.description && (
                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {template.description}
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
