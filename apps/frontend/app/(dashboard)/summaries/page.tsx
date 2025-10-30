'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/providers/auth.provider'
import { useCreateSummary, useSummaries } from '@/lib/hooks/useSummaries'
import { SummaryForm } from '@/components/summaries/SummaryForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { CreateSummaryParams } from '@/lib/api/summaries'
import { toast } from 'sonner'
import { ArrowLeft, ChevronLeft, ChevronRight, FileText, MessageSquare, List, Trophy, Lightbulb, Hash } from 'lucide-react'
import { SUMMARY_LIMITS, type PlanType } from '@/lib/constants/plan-limits'
import type { SummaryStyle } from '@/lib/api/summaries'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/provider'

// Style badges configuration with icons and colors
const STYLE_CONFIG: Record<SummaryStyle, { icon: typeof FileText; color: string }> = {
  SHORT: { icon: FileText, color: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400' },
  TWEET: { icon: Hash, color: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-400' },
  THREAD: { icon: MessageSquare, color: 'bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400' },
  BULLET_POINT: { icon: List, color: 'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400' },
  TOP3: { icon: Trophy, color: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400' },
  MAIN_POINTS: { icon: Lightbulb, color: 'bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400' },
}

export default function SummariesPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const router = useRouter()
  const showMyOnly = searchParams.get('my') === 'true'
  const [initialUrl, setInitialUrl] = useState<string | null>(null)
  const [historyPage, setHistoryPage] = useState(1)

  // Get URL from query params
  useEffect(() => {
    const url = searchParams.get('url')
    if (url) {
      setInitialUrl(url)
    }
  }, [searchParams])

  // Mutations et queries
  const createSummary = useCreateSummary()
  const { data: summariesData, isLoading: isLoadingHistory } = useSummaries({ page: historyPage, limit: 10 })

  // Calculer l'utilisation du plan
  const planType = (user?.planType || 'FREE') as PlanType
  const summariesThisMonth = summariesData?.data.pagination.totalThisMonth || 0
  const limit = SUMMARY_LIMITS[planType]
  const percentage = limit === Infinity ? 0 : Math.round((summariesThisMonth / limit) * 100)

  const handleSubmit = async (params: CreateSummaryParams) => {
    createSummary.mutate(params, {
      onSuccess: (response) => {
        if (response.success && response.data.jobId) {
          // Redirect to the creation page with progress bar
          router.push(`/summaries/create?jobId=${response.data.jobId}`)
        }
      },
      onError: (error: Error) => {
        const errorResponse = error as Error & { response?: { status?: number } }
        if (errorResponse?.response?.status === 403) {
          toast.error(t('summaries.form.errors.planLimitReached'))
        } else if (errorResponse?.response?.status === 429) {
          toast.error(t('summaries.form.errors.rateLimitReached'))
        } else {
          toast.error(t('summaries.form.errors.creationFailed'))
        }
      },
    })
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          {showMyOnly && (
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('summaries.actions.back')}
            </Button>
          )}
        </div>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {showMyOnly ? t('summaries.mySummaries') : t('summaries.title')}
        </h1>
        <p className="text-lg text-muted-foreground">
          {showMyOnly
            ? t('summaries.summariesThisMonth', { count: summariesThisMonth.toString() })
            : t('summaries.subtitle')
          }
        </p>
      </div>

      {/* Plan Usage Card - Hide when in my-only mode */}
      {!showMyOnly && (
        <Card className="shadow-lg border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">{t('summaries.planUsage.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">{t('summaries.planUsage.summariesThisMonth')}</span>
                <span className="text-2xl font-bold text-primary">
                  {summariesThisMonth} <span className="text-lg text-muted-foreground">/ {limit === Infinity ? '∞' : limit}</span>
                </span>
              </div>
              {limit !== Infinity && (
                <div className="w-full bg-secondary rounded-full h-3 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-500 shadow-sm"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              )}
              {percentage >= 80 && limit !== Infinity && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-500">
                    {t('summaries.planUsage.limitWarning')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Two-column layout */}
      <div className={showMyOnly ? 'grid grid-cols-1' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'}>
        {/* Main content - Form (hide in my-only mode) */}
        {!showMyOnly && (
          <div className="lg:col-span-2">
            {/* Summary Form */}
            <Card className="shadow-xl border-2">
              <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="text-xl font-bold">{t('summaries.form.title')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <SummaryForm onSubmit={handleSubmit} isLoading={createSummary.isPending} initialUrl={initialUrl} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sidebar - History */}
        <div className={showMyOnly ? '' : 'lg:col-span-1'}>
          <Card className="shadow-lg border-2">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="text-lg font-bold">{t('summaries.history.title')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoadingHistory ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 rounded-xl border-2 bg-card animate-pulse">
                      <div className="flex items-start gap-3">
                        {/* Image skeleton */}
                        <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0" />
                        <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Title skeleton */}
                            <div className="h-4 bg-muted rounded w-3/4" />
                            {/* Date skeleton */}
                            <div className="h-3 bg-muted rounded w-24" />
                          </div>
                          {/* Badge skeleton */}
                          <div className="h-6 w-20 bg-muted rounded-full shrink-0" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : summariesData?.data.summaries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="relative mb-4">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <FileText className="h-12 w-12 text-primary/60" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center animate-pulse">
                      <span className="text-white text-xl">✨</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {t('summaries.history.empty')}
                  </h3>
                  <p className="text-sm text-muted-foreground text-center max-w-xs mb-4">
                    {t('summaries.history.emptySubtitle')}
                  </p>
                  {!showMyOnly && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const form = document.querySelector('form')
                        form?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }}
                      className="group"
                    >
                      <span className="mr-2 group-hover:scale-110 transition-transform inline-block">📝</span>
                      {t('summaries.history.createButton')}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {summariesData?.data.summaries.map((summary) => (
                      <Link
                        key={summary.id}
                        href={`/summaries/${summary.id}`}
                        className="group block w-full text-left p-4 rounded-xl border-2 hover:border-primary/50 bg-card hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                      >
                        <div className="flex items-start gap-3">
                          {summary.coverImage && (
                            <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 shadow-md ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                              <Image
                                src={summary.coverImage}
                                alt={summary.title || 'Summary cover'}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-300"
                                unoptimized
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                {summary.title || summary.summaryText.substring(0, 50) + '...'}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground" />
                                {new Date(summary.createdAt).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            {(() => {
                              const styleConfig = STYLE_CONFIG[summary.style as SummaryStyle]
                              const StyleIcon = styleConfig.icon
                              return (
                                <span className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shrink-0 shadow-sm border",
                                  styleConfig.color
                                )}>
                                  <StyleIcon className="h-3 w-3" />
                                  {t(`summaries.styles.${summary.style as SummaryStyle}`)}
                                </span>
                              )
                            })()}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Pagination Controls */}
                  {summariesData && summariesData.data.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between gap-2 mt-4 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        {t('summaries.history.pagination.previous')}
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        {t('summaries.history.pagination.page', { current: summariesData.data.pagination.page.toString(), total: summariesData.data.pagination.totalPages.toString() })}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage((p) => Math.min(summariesData.data.pagination.totalPages, p + 1))}
                        disabled={historyPage === summariesData.data.pagination.totalPages}
                      >
                        {t('summaries.history.pagination.next')}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
