import { memo, useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/provider'
import type { Article } from '@/types'
import { Bookmark, BookmarkCheck, ExternalLink, Newspaper, Sparkles } from 'lucide-react'

export interface ArticleCardProps {
  article: Article
  isSaved?: boolean
  onSave?: (articleId: string) => void
  onUnsave?: (articleId: string) => void
  isLoading?: boolean
}

export const ArticleCard = memo(function ArticleCard({ article, isSaved = false, onSave, onUnsave, isLoading = false }: ArticleCardProps) {
  const { t } = useI18n()
  const router = useRouter()
  const [imageError, setImageError] = useState(false)

  const handleToggleSave = useCallback(() => {
    if (isSaved) {
      onUnsave?.(article.id)
    } else {
      onSave?.(article.id)
    }
  }, [isSaved, article.id, onSave, onUnsave])

  const handleSummarize = useCallback(() => {
    router.push(`/summaries?url=${encodeURIComponent(article.url)}`)
  }, [router, article.url])

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

  // Note: Favicon feature disabled - Google Favicon API is unreliable and causes 404 errors
  // TODO: Implement backend favicon caching or use a more reliable favicon service
  // Currently using Newspaper icon as placeholder for all articles without images

  return (
    <Card className="group hover:shadow-xl hover:border-primary/30 transition-all duration-300 overflow-hidden border-2">
      <div className="flex flex-col md:flex-row">
        {/* Article Image or Placeholder */}
        <div className="w-full md:w-48 h-48 md:h-auto flex-shrink-0 relative">
          {showPlaceholder ? (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Newspaper className="h-16 w-16 text-white/80" />
            </div>
          ) : (
            <Image
              src={article.imageUrl || ''}
              alt={article.title}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
              unoptimized
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
                    className="hover:text-primary transition-colors inline-flex items-center gap-2 group-hover:underline"
                  >
                    {article.title}
                    <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
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
          <CardFooter className="flex flex-col gap-4">
            {article.tags && article.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {article.tags.map((tag, index) => {
                  const colors = [
                    'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400',
                    'bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400',
                    'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400',
                    'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400',
                    'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:text-rose-400',
                  ]
                  return (
                    <span
                      key={tag}
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border shadow-sm ${colors[index % colors.length]}`}
                    >
                      #{tag}
                    </span>
                  )
                })}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSummarize}
              className="w-full group/btn hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 hover:border-primary transition-all"
            >
              <Sparkles className="h-4 w-4 mr-2 group-hover/btn:scale-110 transition-transform" />
              {t('veille.actions.summarize')}
            </Button>
          </CardFooter>
        </div>
      </div>
    </Card>
  )
})
