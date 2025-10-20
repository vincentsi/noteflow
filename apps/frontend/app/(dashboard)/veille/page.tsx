'use client'

import { useState } from 'react'
import { useAuth } from '@/providers/auth.provider'
import { useArticles, useSaveArticle, useUnsaveArticle } from '@/lib/hooks/useArticles'
import { ArticleFilters } from '@/components/veille/ArticleFilters'
import { ArticleList } from '@/components/veille/ArticleList'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GetSavedArticlesParams } from '@/lib/api/articles'

// Plan limits for saved articles
const PLAN_LIMITS = {
  FREE: 10,
  STARTER: 50,
  PRO: Infinity,
} as const

export default function VeillePage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<GetSavedArticlesParams>({})

  // Fetch saved articles
  const { data: savedArticles = [], isLoading, error } = useArticles(filters)

  // Mutations for save/unsave
  const saveArticle = useSaveArticle()
  const unsaveArticle = useUnsaveArticle()

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
        <h1 className="text-3xl font-bold">Veille IA</h1>
        <p className="text-muted-foreground">
          Your curated feed of AI and tech articles
        </p>
      </div>

      {/* Plan Usage Card */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Saved Articles</span>
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
                You&apos;re approaching your plan limit. Consider upgrading to save more articles.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <ArticleFilters filters={filters} onChange={setFilters} />

      {/* Article List */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Saved Articles</h2>
        {error && (
          <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
            Failed to load articles. Please try again later.
          </div>
        )}
        <ArticleList
          articles={savedArticles}
          onSave={handleSave}
          onUnsave={handleUnsave}
          isLoading={isLoading || saveArticle.isPending || unsaveArticle.isPending}
        />
      </div>
    </div>
  )
}
