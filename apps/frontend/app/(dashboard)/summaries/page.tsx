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

// Style badges configuration with icons (simplified)
const STYLE_CONFIG: Record<SummaryStyle, { icon: typeof FileText }> = {
  SHORT: { icon: FileText },
  TWEET: { icon: Hash },
  THREAD: { icon: MessageSquare },
  BULLET_POINT: { icon: List },
  TOP3: { icon: Trophy },
  MAIN_POINTS: { icon: Lightbulb },
}

export default function SummariesPage() {
  const { user, isAuthenticated } = useAuth()
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
    if (!isAuthenticated) {
      toast.error(t('common.messages.loginRequired'), {
        action: {
          label: t('common.navigation.login'),
          onClick: () => router.push('/login'),
        },
      })
      return
    }

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
      <div>
        {showMyOnly && (
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('summaries.actions.back')}
          </Button>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {showMyOnly ? t('summaries.mySummaries') : t('summaries.title')}
        </h1>
        <p className="text-base text-muted-foreground mt-2">
          {showMyOnly
            ? t('summaries.summariesThisMonth', { count: summariesThisMonth.toString() })
            : t('summaries.subtitle')
          }
        </p>
      </div>

      {/* Plan Usage Card - Hide when in my-only mode */}
      {!showMyOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t('summaries.planUsage.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">{t('summaries.planUsage.summariesThisMonth')}</span>
                <span className="text-xl font-bold text-foreground">
                  {summariesThisMonth} <span className="text-sm text-muted-foreground font-normal">/ {limit === Infinity ? '∞' : limit}</span>
                </span>
              </div>
              {limit !== Infinity && (
                <div className="w-full bg-muted rounded-sm h-2">
                  <div
                    className={`h-2 rounded-sm transition-all duration-300 ${percentage >= 80 ? 'bg-primary' : 'bg-foreground'}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              )}
              {percentage >= 80 && limit !== Infinity && (
                <div className="p-3 bg-muted border border-border rounded-md">
                  <p className="text-xs font-medium text-foreground">
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
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-lg font-semibold">{t('summaries.form.title')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <SummaryForm onSubmit={handleSubmit} isLoading={createSummary.isPending} initialUrl={initialUrl} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sidebar - History */}
        <div className={showMyOnly ? '' : 'lg:col-span-1'}>
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base font-semibold">{t('summaries.history.title')}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoadingHistory ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 rounded-md border border-border bg-card animate-pulse">
                      <div className="flex items-start gap-3">
                        {/* Image skeleton */}
                        <div className="w-16 h-16 rounded-sm bg-muted flex-shrink-0" />
                        <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Title skeleton */}
                            <div className="h-4 bg-muted rounded-sm w-3/4" />
                            {/* Date skeleton */}
                            <div className="h-3 bg-muted rounded-sm w-20" />
                          </div>
                          {/* Badge skeleton */}
                          <div className="h-6 w-16 bg-muted rounded-sm shrink-0" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : summariesData?.data.summaries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 rounded-md border border-border bg-muted flex items-center justify-center mb-6">
                    <FileText className="h-8 w-8 text-muted-foreground" />
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
                    >
                      {t('summaries.history.createButton')}
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {summariesData?.data.summaries.map((summary) => (
                      <Link
                        key={summary.id}
                        href={`/summaries/${summary.id}`}
                        className="group block w-full text-left p-3 rounded-md border border-border hover:border-primary bg-card transition-all duration-150 hover:-translate-y-0.5"
                      >
                        <div className="flex items-start gap-3">
                          {summary.coverImage && (
                            <div className="relative w-16 h-16 rounded-sm overflow-hidden flex-shrink-0">
                              <Image
                                src={summary.coverImage}
                                alt={summary.title || 'Summary cover'}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                {summary.title || summary.summaryText.substring(0, 50) + '...'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(summary.createdAt).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            {(() => {
                              const styleConfig = STYLE_CONFIG[summary.style as SummaryStyle]
                              const StyleIcon = styleConfig.icon
                              return (
                                <span className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium shrink-0 border border-border bg-background">
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
