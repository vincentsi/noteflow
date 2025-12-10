'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { summariesApi } from '@/lib/api/summaries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, MessageSquare, List, Trophy, Lightbulb, Hash, Copy, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Style badges configuration with icons
const STYLE_ICON_CONFIG = {
  SHORT: { icon: FileText, label: 'Short' },
  TWEET: { icon: Hash, label: 'Tweet' },
  THREAD: { icon: MessageSquare, label: 'Thread' },
  BULLET_POINT: { icon: List, label: 'Bullet Points' },
  TOP3: { icon: Trophy, label: 'Top 3' },
  MAIN_POINTS: { icon: Lightbulb, label: 'Main Points' },
}

export default function PublicSharePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  // Fetch public summary by token
  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-summary', token],
    queryFn: () => summariesApi.getPublicSummary(token),
    retry: false,
  })

  const summary = data?.data.summary

  // Redirect to home if summary not found
  useEffect(() => {
    if (isError) {
      router.push('/')
    }
  }, [isError, router])

  const handleCopy = async () => {
    if (!summary) return
    try {
      await navigator.clipboard.writeText(summary.summaryText)
      toast.success('Summary copied to clipboard!')
    } catch {
      toast.error('Failed to copy summary')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getStyleConfig = (style: string) => {
    return STYLE_ICON_CONFIG[style as keyof typeof STYLE_ICON_CONFIG] || STYLE_ICON_CONFIG.SHORT
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-1 bg-primary rounded-full" />
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Shared Summary
            </h1>
          </div>
          <p className="text-muted-foreground">
            This summary has been shared publicly with you
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <Card className="shadow-xl border-2 overflow-hidden animate-pulse">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent space-y-4">
              <div className="h-8 bg-muted rounded w-3/4" />
              <div className="flex gap-3">
                <div className="h-6 w-24 bg-muted rounded-full" />
                <div className="h-6 w-32 bg-muted rounded-full" />
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-3/4" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Display Summary */}
        {summary && (
          <Card className="shadow-xl border-2 overflow-hidden">
            {/* Header */}
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="text-2xl font-bold">
                {summary.title || 'Untitled Summary'}
              </CardTitle>
              <div className="flex flex-wrap gap-2 pt-2">
                {/* Style badge */}
                <div className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
                  'bg-primary/10 text-primary border border-primary/20'
                )}>
                  {(() => {
                    const styleConfig = getStyleConfig(summary.style)
                    const Icon = styleConfig.icon
                    return (
                      <>
                        <Icon className="h-3.5 w-3.5" />
                        {styleConfig.label}
                      </>
                    )
                  })()}
                </div>

                {/* Date badge */}
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  {formatDate(summary.createdAt)}
                </div>
              </div>
            </CardHeader>

            {/* Summary Content */}
            <CardContent className="pt-6 space-y-6">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap text-foreground leading-relaxed">
                  {summary.summaryText}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  aria-label="Copy summary"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Summary
                </Button>
              </div>

              {/* Footer */}
              <div className="pt-4 text-center text-sm text-muted-foreground">
                Generated by <span className="font-semibold text-primary">NoteFlow</span>
                <div className="mt-2">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => router.push('/')}
                  >
                    Create your own summaries
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {isError && (
          <Card className="shadow-xl border-2 border-destructive/20">
            <CardContent className="pt-6 text-center py-12">
              <p className="text-muted-foreground mb-4">
                This summary could not be found or is no longer publicly shared.
              </p>
              <Button onClick={() => router.push('/')}>
                Go to Home
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
