'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useI18n } from '@/lib/i18n/provider'

interface UsageStats {
  articles: {
    current: number
    limit: number | null
  }
  summaries: {
    current: number
    limit: number | null
  }
  notes: {
    current: number
    limit: number | null
  }
}

interface PlanUsageCardProps {
  stats: UsageStats
  plan?: string
}

function ProgressBar({ value, max, isNearLimit }: { value: number; max: number | null; isNearLimit: boolean }) {
  if (max === null) {
    return (
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-foreground" style={{ width: '100%' }} />
      </div>
    )
  }

  const percentage = Math.min((value / max) * 100, 100)

  return (
    <div className="h-2 w-full bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div
        className={`h-full transition-all duration-300 ${isNearLimit ? 'bg-primary' : 'bg-foreground'}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

export function PlanUsageCard({ stats, plan }: PlanUsageCardProps) {
  const { t } = useI18n()
  const isPro = plan === 'PRO'

  // Check if any usage is near limit (>= 80%)
  const isNearLimit =
    !isPro &&
    (stats.articles.limit && stats.articles.current / stats.articles.limit >= 0.8 ||
    stats.summaries.limit && stats.summaries.current / stats.summaries.limit >= 0.8 ||
    stats.notes.limit && stats.notes.current / stats.notes.limit >= 0.8)

  const formatLimit = (limit: number | null) => {
    if (limit === null) return t('dashboard.planUsage.unlimited')
    return limit.toString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('dashboard.planUsage.title')}</CardTitle>
        <CardDescription>
          {t('dashboard.planUsage.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Articles */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t('dashboard.planUsage.savedArticles')}</span>
            <span className="text-muted-foreground">
              {stats.articles.current} / {formatLimit(stats.articles.limit)}
            </span>
          </div>
          <ProgressBar
            value={stats.articles.current}
            max={stats.articles.limit}
            isNearLimit={stats.articles.limit !== null && stats.articles.current / stats.articles.limit >= 0.8}
          />
          {stats.articles.current > 0 && (
            <Button asChild variant="outline" size="sm" className="w-full mt-2">
              <Link href="/veille?saved=true">
                {t('dashboard.planUsage.viewSavedArticles')}
              </Link>
            </Button>
          )}
        </div>

        {/* Summaries */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t('dashboard.planUsage.summariesThisMonth')}</span>
            <span className="text-muted-foreground">
              {stats.summaries.current} / {formatLimit(stats.summaries.limit)}
            </span>
          </div>
          <ProgressBar
            value={stats.summaries.current}
            max={stats.summaries.limit}
            isNearLimit={stats.summaries.limit !== null && stats.summaries.current / stats.summaries.limit >= 0.8}
          />
          {stats.summaries.current > 0 && (
            <Button asChild variant="outline" size="sm" className="w-full mt-2">
              <Link href="/summaries?my=true" prefetch={false}>
                {t('dashboard.planUsage.viewSummaries')}
              </Link>
            </Button>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{t('dashboard.planUsage.notes')}</span>
            <span className="text-muted-foreground">
              {stats.notes.current} / {formatLimit(stats.notes.limit)}
            </span>
          </div>
          <ProgressBar
            value={stats.notes.current}
            max={stats.notes.limit}
            isNearLimit={stats.notes.limit !== null && stats.notes.current / stats.notes.limit >= 0.8}
          />
          {stats.notes.current > 0 && (
            <Button asChild variant="outline" size="sm" className="w-full mt-2">
              <Link href="/notes?my=true">
                {t('dashboard.planUsage.viewNotes')}
              </Link>
            </Button>
          )}
        </div>

        {/* Upgrade CTA if near limit */}
        {isNearLimit && (
          <div className="pt-4 border-t">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">
                {t('dashboard.planUsage.nearLimit')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('dashboard.planUsage.nearLimitDescription')}
              </p>
              <Button asChild className="w-full">
                <Link href="/pricing">
                  {t('dashboard.planUsage.viewPlans')}
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Pro unlimited badge */}
        {isPro && (
          <div className="pt-4 border-t">
            <div className="rounded-md bg-foreground p-4 text-center">
              <p className="text-sm font-medium text-background">
                {t('dashboard.planUsage.proUnlimited')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
