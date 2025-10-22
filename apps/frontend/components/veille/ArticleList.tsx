import { ArticleCard } from './ArticleCard'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { Article, SavedArticle } from '@/types'

export interface ArticleListProps {
  articles: Article[]
  savedArticleIds?: Set<string>
  onSave?: (articleId: string) => void
  onUnsave?: (articleId: string) => void
  isLoading?: boolean
}

export function ArticleList({ articles, savedArticleIds = new Set(), onSave, onUnsave, isLoading = false }: ArticleListProps) {
  const { t } = useTranslation()

  // Empty state
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">{t('veille.articleList.empty')}</p>
        <p className="text-sm text-muted-foreground mt-2">
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
}
