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

  // FIXME: Backend doesn't return total count yet, so we estimate based on results
  // If we get exactly ARTICLES_PER_PAGE results, assume there might be more pages
  const articlesCount = data?.articles?.length || 0
  const totalArticles = data?.total || (articlesCount === ARTICLES_PER_PAGE ? articlesCount * 10 : articlesCount)
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
        {showSavedOnly && (
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.actions.back')}
          </Button>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {showSavedOnly ? t('veille.savedArticlesTitle') : t('veille.title')}
        </h1>
        <p className="text-base text-muted-foreground mt-2">
          {showSavedOnly
            ? t(savedCount === 1 ? 'veille.savedArticlesCount' : 'veille.savedArticlesCount_plural', { count: savedCount })
            : t('veille.subtitle')
          }
        </p>
      </div>

      {/* Plan Usage Card - Only show when not in saved-only mode */}
      {!showSavedOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t('veille.planUsage.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-foreground">{t('veille.planUsage.savedArticles')}</span>
                <span className="text-xl font-bold text-foreground">
                  {savedCount} <span className="text-sm text-muted-foreground font-normal">/ {limit === Infinity ? '∞' : limit}</span>
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
      <div className="space-y-4">
        {!showSavedOnly && <h2 className="text-lg font-semibold text-foreground">{t('veille.articleList.title')}</h2>}
        {error && !showSavedOnly && (
          <div className="p-4 text-sm text-foreground bg-muted border border-border rounded-md">
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
