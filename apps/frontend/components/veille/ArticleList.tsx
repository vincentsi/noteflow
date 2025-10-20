import { ArticleCard } from './ArticleCard'
import type { SavedArticle } from '@/types'

export interface ArticleListProps {
  articles: SavedArticle[]
  onSave?: (articleId: string) => void
  onUnsave?: (articleId: string) => void
  isLoading?: boolean
}

export function ArticleList({ articles, onSave, onUnsave, isLoading = false }: ArticleListProps) {
  // Empty state
  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium text-muted-foreground">No articles found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Articles you save will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:gap-6">
      {articles.map((savedArticle) => (
        <ArticleCard
          key={savedArticle.id}
          article={savedArticle.article}
          isSaved={true}
          onSave={onSave}
          onUnsave={onUnsave}
          isLoading={isLoading}
        />
      ))}
    </div>
  )
}
