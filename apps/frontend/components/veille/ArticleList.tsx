import { memo } from 'react'
import { ArticleCard } from './ArticleCard'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { Article } from '@/types'
import { Newspaper } from 'lucide-react'
import { Card } from '@/components/ui/card'

export interface ArticleListProps {
  articles: Article[]
  savedArticleIds?: Set<string>
  onSave?: (articleId: string) => void
  onUnsave?: (articleId: string) => void
  isLoading?: boolean
}

export const ArticleList = memo(function ArticleList({ articles, savedArticleIds = new Set(), onSave, onUnsave, isLoading = false }: ArticleListProps) {
  const { t } = useTranslation()

  // Loading skeleton
  if (isLoading && articles.length === 0) {
    return (
      <div className="grid gap-4 md:gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden animate-pulse">
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-48 h-48 bg-muted" />
              <div className="flex-1 p-6 space-y-4">
                <div className="space-y-2">
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-32" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-muted rounded-full" />
                  <div className="h-6 w-20 bg-muted rounded-full" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  // Empty state
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="relative mb-6">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Newspaper className="h-14 w-14 text-primary/60" />
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center animate-pulse">
            <span className="text-white text-2xl">📰</span>
          </div>
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">
          {t('veille.articleList.empty')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {t('veille.articleList.emptySubtitle')}
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:gap-6">
      {articles.map((article) => (
        <ArticleCard
          key={article.id}
          article={article}
          isSaved={savedArticleIds.has(article.id)}
          onSave={onSave}
          onUnsave={onUnsave}
          isLoading={isLoading}
        />
      ))}
    </div>
  )
})
