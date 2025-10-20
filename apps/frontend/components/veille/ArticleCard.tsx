import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { Article } from '@/types'
import { Bookmark, BookmarkCheck, ExternalLink } from 'lucide-react'

export interface ArticleCardProps {
  article: Article
  isSaved?: boolean
  onSave?: (articleId: string) => void
  onUnsave?: (articleId: string) => void
  isLoading?: boolean
}

export function ArticleCard({ article, isSaved = false, onSave, onUnsave, isLoading = false }: ArticleCardProps) {
  const { t } = useTranslation()

  const handleToggleSave = () => {
    if (isSaved) {
      onUnsave?.(article.id)
    } else {
      onSave?.(article.id)
    }
  }

  // Format date (e.g., "Jan 15, 2025")
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline inline-flex items-center gap-2"
              >
                {article.title}
                <ExternalLink className="h-4 w-4" />
              </a>
            </CardTitle>
            <CardDescription className="mt-2">
              <span className="font-medium">{article.source}</span> · {formatDate(article.publishedAt)}
            </CardDescription>
          </div>
          {(onSave || onUnsave) && (
            <CardAction>
              <Button
                variant={isSaved ? 'default' : 'outline'}
                size="sm"
                onClick={handleToggleSave}
                disabled={isLoading}
                aria-label={isSaved ? t('veille.actions.unsave') : t('veille.actions.save')}
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="h-4 w-4 mr-2" />
                    {t('veille.actions.saved')}
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4 mr-2" />
                    {t('veille.actions.save')}
                  </>
                )}
              </Button>
            </CardAction>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">{article.excerpt}</p>
      </CardContent>
      {article.tags && article.tags.length > 0 && (
        <CardFooter>
          <div className="flex gap-2 flex-wrap">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        </CardFooter>
      )}
    </Card>
  )
}
