import { memo, useCallback, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { Article } from '@/types'
import { Bookmark, BookmarkCheck, ExternalLink, Newspaper } from 'lucide-react'

export interface ArticleCardProps {
  article: Article
  isSaved?: boolean
  onSave?: (articleId: string) => void
  onUnsave?: (articleId: string) => void
  isLoading?: boolean
}

export const ArticleCard = memo(function ArticleCard({ article, isSaved = false, onSave, onUnsave, isLoading = false }: ArticleCardProps) {
  const { t } = useTranslation()
  const [imageError, setImageError] = useState(false)

  const handleToggleSave = useCallback(() => {
    if (isSaved) {
      onUnsave?.(article.id)
    } else {
      onSave?.(article.id)
    }
  }, [isSaved, article.id, onSave, onUnsave])

  // Format date (e.g., "Jan 15, 2025") - memoized to avoid recalculation
  const formattedDate = useMemo(() => {
    const date = new Date(article.publishedAt)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }, [article.publishedAt])

  const showPlaceholder = !article.imageUrl || imageError

  // Get favicon URL from article URL
  const getFaviconUrl = useCallback((url: string) => {
    try {
      const domain = new URL(url).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    } catch {
      return null
    }
  }, [])

  const faviconUrl = useMemo(() => getFaviconUrl(article.url), [article.url, getFaviconUrl])

  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Article Image or Placeholder */}
        <div className="w-full md:w-48 h-48 md:h-auto flex-shrink-0 relative">
          {showPlaceholder ? (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              {faviconUrl ? (
                <img
                  src={faviconUrl}
                  alt={article.source}
                  className="h-24 w-24 object-contain opacity-80"
                />
              ) : (
                <Newspaper className="h-16 w-16 text-white/80" />
              )}
            </div>
          ) : (
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          )}
        </div>

        {/* Article Content */}
        <div className="flex-1 flex flex-col">
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
                  <span className="font-medium">{article.source}</span> · {formattedDate}
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
        </div>
      </div>
    </Card>
  )
})
