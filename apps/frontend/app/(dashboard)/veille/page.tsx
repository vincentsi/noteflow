'use client'

import { useState, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth.provider'
import { useAllArticles, useArticles, useSaveArticle, useUnsaveArticle } from '@/lib/hooks/useArticles'
import { useI18n } from '@/lib/i18n/provider'
import { ArticleFilters } from '@/components/veille/ArticleFilters'
import { ArticleList } from '@/components/veille/ArticleList'
import { Pagination } from '@/components/ui/pagination'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import type { GetArticlesParams } from '@/lib/api/articles'

// Pagination constants
const ARTICLES_PER_PAGE = 20

// Plan limits for saved articles
const PLAN_LIMITS = {
  FREE: 10,
  STARTER: 50,
  PRO: Infinity,
} as const

export default function VeillePage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const showSavedOnly = searchParams.get('saved') === 'true'

  const [filters, setFilters] = useState<GetArticlesParams>({})
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch all articles from RSS feeds with pagination
  const { data, isLoading, error } = useAllArticles({
    ...filters,
    skip: (currentPage - 1) * ARTICLES_PER_PAGE,
    take: ARTICLES_PER_PAGE,
  })

  const totalArticles = data?.total || 0
  const totalPages = Math.ceil(totalArticles / ARTICLES_PER_PAGE)

  // Fetch saved articles to know which ones are saved
  const { data: savedArticles = [] } = useArticles()

  // Mutations for save/unsave
  const saveArticle = useSaveArticle()
  const unsaveArticle = useUnsaveArticle()

  // Create a Set of saved article IDs for fast lookup
  const savedArticleIds = useMemo(() => {
    return new Set(savedArticles.map(saved => saved.articleId))
  }, [savedArticles])

  // Determine which articles to display
  const displayArticles = useMemo(() => {
    if (showSavedOnly) {
      // Show only saved articles with full article data
      return savedArticles.map(saved => saved.article)
    }
    return data?.articles || []
  }, [showSavedOnly, savedArticles, data?.articles])

  // Calculate plan usage
  const planType = (user?.planType || 'FREE') as keyof typeof PLAN_LIMITS
  const savedCount = savedArticles.length
  const limit = PLAN_LIMITS[planType]
  const percentage = limit === Infinity ? 0 : Math.round((savedCount / limit) * 100)

  const handleSave = useCallback((articleId: string) => {
    saveArticle.mutate(articleId)
  }, [saveArticle])

  const handleUnsave = useCallback((articleId: string) => {
    unsaveArticle.mutate(articleId)
  }, [unsaveArticle])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          {showSavedOnly && (
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.actions.back')}
            </Button>
          )}
        </div>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {showSavedOnly ? t('veille.savedArticlesTitle') : t('veille.title')}
        </h1>
        <p className="text-muted-foreground mt-2">
          {showSavedOnly
            ? t(savedCount === 1 ? 'veille.savedArticlesCount' : 'veille.savedArticlesCount_plural', { count: savedCount })
            : t('veille.subtitle')
          }
        </p>
      </div>

      {/* Plan Usage Card - Only show when not in saved-only mode */}
      {!showSavedOnly && (
        <Card className="shadow-lg border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">{t('veille.planUsage.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-foreground">{t('veille.planUsage.savedArticles')}</span>
                <span className="text-2xl font-bold text-primary">
                  {savedCount} <span className="text-lg text-muted-foreground">/ {limit === Infinity ? '∞' : limit}</span>
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
                    {t('veille.planUsage.limitWarning')}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters - Only show when not in saved-only mode */}
      {!showSavedOnly && (
        <ArticleFilters
          filters={filters}
          onChange={(newFilters) => {
            setFilters(newFilters)
            setCurrentPage(1) // Reset to first page when filters change
          }}
        />
      )}

      {/* Article List */}
      <div className="space-y-6">
        {!showSavedOnly && <h2 className="text-xl font-semibold">{t('veille.articleList.title')}</h2>}
        {error && !showSavedOnly && (
          <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            {t('veille.articleList.errorLoading')}
          </div>
        )}
        <ArticleList
          articles={displayArticles}
          savedArticleIds={savedArticleIds}
          onSave={handleSave}
          onUnsave={handleUnsave}
          isLoading={isLoading || saveArticle.isPending || unsaveArticle.isPending}
        />

        {/* Pagination - Only show when not in saved-only mode */}
        {!showSavedOnly && !isLoading && displayArticles.length > 0 && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => {
              setCurrentPage(page)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        )}
      </div>
    </div>
  )
}
