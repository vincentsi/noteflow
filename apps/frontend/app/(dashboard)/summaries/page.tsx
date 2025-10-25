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
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { SUMMARY_LIMITS, type PlanType } from '@/lib/constants/plan-limits'

export default function SummariesPage() {
  const { user } = useAuth()
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
          toast.error('Limite du plan atteinte. Veuillez mettre à niveau votre plan.')
        } else {
          toast.error('Erreur lors de la création du résumé')
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          {showMyOnly && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/summaries">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
          )}
        </div>
        <h1 className="text-3xl font-bold">
          {showMyOnly ? 'Mes résumés' : 'PowerPost'}
        </h1>
        <p className="text-muted-foreground">
          {showMyOnly
            ? `${summariesThisMonth} résumé${summariesThisMonth > 1 ? 's' : ''} ce mois`
            : 'Générez des résumés IA de vos textes et documents'
          }
        </p>
      </div>

      {/* Plan Usage Card - Hide when in my-only mode */}
      {!showMyOnly && (
        <Card>
          <CardHeader>
            <CardTitle>Utilisation du plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Résumés ce mois</span>
                <span className="text-muted-foreground">
                  {summariesThisMonth} / {limit === Infinity ? '∞' : limit}
                </span>
              </div>
              {limit !== Infinity && (
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              )}
              {percentage >= 80 && limit !== Infinity && (
                <p className="text-xs text-amber-600">
                  Vous approchez de votre limite mensuelle
                </p>
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
              <CardHeader>
                <CardTitle>Nouveau résumé</CardTitle>
              </CardHeader>
              <CardContent>
                <SummaryForm onSubmit={handleSubmit} isLoading={createSummary.isPending} initialUrl={initialUrl} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sidebar - History */}
        <div className={showMyOnly ? '' : 'lg:col-span-1'}>
          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span className="text-sm">Chargement...</span>
                  </div>
                </div>
              ) : summariesData?.data.summaries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucun résumé pour le moment
                </p>
              ) : (
                <>
                  <div className="space-y-3">
                    {summariesData?.data.summaries.map((summary) => (
                      <Link
                        key={summary.id}
                        href={`/summaries/${summary.id}`}
                        className="block w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          {summary.coverImage && (
                            <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
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
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {summary.title || summary.summaryText.substring(0, 50) + '...'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(summary.createdAt).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary shrink-0">
                              {summary.style}
                            </span>
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
                        Précédent
                      </Button>
                      <span className="text-xs text-muted-foreground">
                        Page {summariesData.data.pagination.page} / {summariesData.data.pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage((p) => Math.min(summariesData.data.pagination.totalPages, p + 1))}
                        disabled={historyPage === summariesData.data.pagination.totalPages}
                      >
                        Suivant
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
