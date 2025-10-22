'use client'

import { useState, useMemo } from 'react'
import { useAuth } from '@/providers/auth.provider'
import { useAllArticles, useArticles, useSaveArticle, useUnsaveArticle } from '@/lib/hooks/useArticles'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { ArticleFilters } from '@/components/veille/ArticleFilters'
import { ArticleList } from '@/components/veille/ArticleList'
import { Pagination } from '@/components/ui/pagination'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const { t } = useTranslation()
  const [filters, setFilters] = useState<GetArticlesParams>({})
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch all articles from RSS feeds with pagination
  const { data, isLoading, error } = useAllArticles({
    ...filters,
    skip: (currentPage - 1) * ARTICLES_PER_PAGE,
    take: ARTICLES_PER_PAGE,
  })

  const allArticles = data?.articles || []
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

  // Calculate plan usage
  const planType = (user?.planType || 'FREE') as keyof typeof PLAN_LIMITS
  const savedCount = savedArticles.length
  const limit = PLAN_LIMITS[planType]
  const percentage = limit === Infinity ? 0 : Math.round((savedCount / limit) * 100)

  const handleSave = (articleId: string) => {
    saveArticle.mutate(articleId)
  }

  const handleUnsave = (articleId: string) => {
    unsaveArticle.mutate(articleId)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('veille.title')}</h1>
        <p className="text-muted-foreground">
          {t('veille.subtitle')}
        </p>
      </div>

      {/* Plan Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('veille.planUsage.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{t('veille.planUsage.savedArticles')}</span>
              <span className="text-muted-foreground">
                {savedCount} / {limit === Infinity ? '∞' : limit}
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
                {t('veille.planUsage.limitWarning')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <ArticleFilters
        filters={filters}
        onChange={(newFilters) => {
          setFilters(newFilters)
          setCurrentPage(1) // Reset to first page when filters change
        }}
      />

      {/* Article List */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">{t('veille.articleList.title')}</h2>
        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            {t('veille.articleList.errorLoading')}
          </div>
        )}
        <ArticleList
          articles={allArticles}
          savedArticleIds={savedArticleIds}
          onSave={handleSave}
          onUnsave={handleUnsave}
          isLoading={isLoading || saveArticle.isPending || unsaveArticle.isPending}
        />

        {/* Pagination */}
        {!isLoading && allArticles.length > 0 && totalPages > 1 && (
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
