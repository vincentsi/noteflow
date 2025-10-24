'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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
        <div className="h-full bg-primary" style={{ width: '100%' }} />
      </div>
    )
  }

  const percentage = Math.min((value / max) * 100, 100)

  return (
    <div className="h-2 w-full bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div
        className={`h-full transition-all ${isNearLimit ? 'bg-destructive' : 'bg-primary'}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

export function PlanUsageCard({ stats, plan }: PlanUsageCardProps) {
  const isPro = plan === 'PRO'

  // Check if any usage is near limit (>= 80%)
  const isNearLimit =
    !isPro &&
    (stats.articles.limit && stats.articles.current / stats.articles.limit >= 0.8 ||
    stats.summaries.limit && stats.summaries.current / stats.summaries.limit >= 0.8 ||
    stats.notes.limit && stats.notes.current / stats.notes.limit >= 0.8)

  const formatLimit = (limit: number | null) => {
    if (limit === null) return 'Illimité'
    return limit.toString()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utilisation du plan</CardTitle>
        <CardDescription>
          Votre utilisation actuelle des ressources
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Articles */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Articles sauvegardés</span>
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
                Voir mes articles sauvegardés
              </Link>
            </Button>
          )}
        </div>

        {/* Summaries */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Résumés (ce mois)</span>
            <span className="text-muted-foreground">
              {stats.summaries.current} / {formatLimit(stats.summaries.limit)}
            </span>
          </div>
          <ProgressBar
            value={stats.summaries.current}
            max={stats.summaries.limit}
            isNearLimit={stats.summaries.limit !== null && stats.summaries.current / stats.summaries.limit >= 0.8}
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Notes</span>
            <span className="text-muted-foreground">
              {stats.notes.current} / {formatLimit(stats.notes.limit)}
            </span>
          </div>
          <ProgressBar
            value={stats.notes.current}
            max={stats.notes.limit}
            isNearLimit={stats.notes.limit !== null && stats.notes.current / stats.notes.limit >= 0.8}
          />
        </div>

        {/* Upgrade CTA if near limit */}
        {isNearLimit && (
          <div className="pt-4 border-t">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <p className="text-sm font-medium">
                Vous approchez de vos limites
              </p>
              <p className="text-sm text-muted-foreground">
                Passez à un plan supérieur pour augmenter vos quotas
              </p>
              <Button asChild className="w-full">
                <Link href="/pricing">
                  Voir les plans
                </Link>
              </Button>
            </div>
          </div>
        )}

        {/* Pro unlimited badge */}
        {isPro && (
          <div className="pt-4 border-t">
            <div className="rounded-lg bg-primary/10 p-4 text-center">
              <p className="text-sm font-medium text-primary">
                ✨ Plan PRO - Utilisation illimitée
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
