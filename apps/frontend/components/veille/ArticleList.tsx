import { memo } from 'react'
import { ArticleCard } from './ArticleCard'
import { useI18n } from '@/lib/i18n/provider'
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
  const { t } = useI18n()

  // Loading skeleton
  if (isLoading && articles.length === 0) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden animate-pulse">
            <div className="flex flex-col sm:flex-row">
              <div className="w-full sm:w-32 h-32 bg-muted" />
              <div className="flex-1 p-4 space-y-3">
                <div className="space-y-2">
                  <div className="h-5 bg-muted rounded-sm w-3/4" />
                  <div className="h-3 bg-muted rounded-sm w-32" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded-sm w-full" />
                  <div className="h-3 bg-muted rounded-sm w-5/6" />
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-12 bg-muted rounded-sm" />
                  <div className="h-5 w-16 bg-muted rounded-sm" />
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
        <div className="w-16 h-16 rounded-md border border-border bg-muted flex items-center justify-center mb-6">
          <Newspaper className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t('veille.articleList.empty')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {t('veille.articleList.emptySubtitle')}
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
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
