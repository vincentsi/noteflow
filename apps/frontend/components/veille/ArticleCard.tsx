import { memo, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/provider'
import type { Article } from '@/types'
import { Bookmark, BookmarkCheck, ExternalLink, Sparkles } from 'lucide-react'

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

  return (
    <Card className="group overflow-hidden">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-base font-semibold leading-tight">
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors inline-flex items-center gap-1.5"
              >
                {article.title}
                <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
            </CardTitle>
            <CardDescription className="text-xs">
              <span className="font-medium">{article.source}</span> · {formattedDate}
            </CardDescription>
          </div>
          {(onSave || onUnsave) && (
            <CardAction>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleSave}
                disabled={isLoading}
                aria-label={isSaved ? t('veille.actions.unsave') : t('veille.actions.save')}
                className="shrink-0"
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="h-4 w-4 text-primary mr-1.5" />
                    <span className="text-xs">{t('veille.actions.saved')}</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4 mr-1.5" />
                    <span className="text-xs">{t('veille.actions.save')}</span>
                  </>
                )}
              </Button>
            </CardAction>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">{article.excerpt}</p>
        {article.tags && article.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-3">
            {article.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-foreground"
              >
                #{tag}
              </span>
            ))}
            {article.tags.length > 3 && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-muted-foreground">
                +{article.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSummarize}
          className="w-full justify-start text-xs font-medium hover:text-primary"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          {t('veille.actions.summarize')}
        </Button>
      </CardFooter>
    </Card>
  )
})
