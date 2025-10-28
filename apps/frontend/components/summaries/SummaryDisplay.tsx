'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Copy, ChevronDown, ChevronUp, Trash2, Share2, FileText, MessageSquare, List, Trophy, Lightbulb, Hash, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import { useDeleteSummary } from '@/lib/hooks/useSummaries'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/provider'

// Style badges configuration with icons and colors (labels will be translated)
const STYLE_ICON_CONFIG = {
  SHORT: { icon: FileText, color: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400' },
  TWEET: { icon: Hash, color: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-400' },
  THREAD: { icon: MessageSquare, color: 'bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400' },
  BULLET_POINT: { icon: List, color: 'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400' },
  TOP3: { icon: Trophy, color: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400' },
  MAIN_POINTS: { icon: Lightbulb, color: 'bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400' },
}

export interface SummaryDisplayProps {
  summary: {
    id: string
    summaryText: string
    originalText: string
    style: string
    title: string | null
    coverImage: string | null
    source: string | null
    language: string
    createdAt: string
  }
}

export function SummaryDisplay({ summary }: SummaryDisplayProps) {
  const [showOriginal, setShowOriginal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const router = useRouter()
  const deleteSummary = useDeleteSummary()
  const { t } = useI18n()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary.summaryText)
      toast.success(t('summaries.messages.summaryCopied'))
    } catch {
      toast.error(t('summaries.messages.summaryCopyError'))
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success(t('summaries.messages.linkCopied'))
    } catch {
      toast.error(t('summaries.messages.linkCopyError'))
    }
  }

  const handleDeleteConfirm = () => {
    deleteSummary.mutate(summary.id, {
      onSuccess: () => {
        toast.success(t('summaries.messages.deleteSuccess'))
        router.push('/summaries')
      },
      onError: () => {
        toast.error(t('summaries.messages.deleteError'))
      },
    })
    setShowDeleteDialog(false)
  }

  // Calculate compression stats
  const originalLength = summary.originalText.length
  const summaryLength = summary.summaryText.length
  const compressionRate = Math.round((1 - summaryLength / originalLength) * 100)

  const toggleOriginal = () => {
    setShowOriginal(!showOriginal)
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

  const styleIconConfig = STYLE_ICON_CONFIG[summary.style as keyof typeof STYLE_ICON_CONFIG]
  const StyleIcon = styleIconConfig?.icon || FileText
  const styleLabel = t(`summaries.styles.${summary.style}` as 'summaries.styles.SHORT')

  return (
    <Card className="shadow-xl border-2 overflow-hidden">
      {summary.coverImage && (
        <div className="relative w-full h-72 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 z-10" />
          <Image
            src={summary.coverImage}
            alt={summary.title || 'Summary cover'}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            {summary.title && (
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {summary.title}
              </CardTitle>
            )}
            <CardDescription className="flex flex-wrap items-center gap-3">
              {styleIconConfig && (
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shrink-0 shadow-sm border",
                  styleIconConfig.color
                )}>
                  <StyleIcon className="h-3.5 w-3.5" />
                  {styleLabel}
                </span>
              )}
              <span className="text-muted-foreground text-sm">{formatDate(summary.createdAt)}</span>
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border",
                "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400"
              )}>
                <BarChart3 className="h-3.5 w-3.5" />
                {compressionRate}% {t('summaries.messages.compression')}
              </span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Summary text */}
          <div className="prose prose-sm max-w-none">
            <div className="p-6 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-transparent border-l-4 border-primary">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed text-base">
                {summary.summaryText}
              </p>
            </div>
          </div>

          {/* Stats card */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{originalLength.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">{t('summaries.messages.originalChars')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summaryLength.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">{t('summaries.messages.summarizedChars')}</div>
            </div>
          </div>

          {/* Original text toggle section with animation */}
          <div className={cn(
            "overflow-hidden transition-all duration-500 ease-in-out",
            showOriginal ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
          )}>
            <div className="p-6 bg-muted/50 rounded-xl border-2 border-dashed border-muted-foreground/20">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">{t('summaries.messages.originalText')}</h4>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {summary.originalText}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 justify-between border-t bg-muted/20">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleOriginal}
            aria-label={showOriginal ? t('summaries.buttons.hideOriginal') : t('summaries.buttons.showOriginal')}
            className="group"
          >
            {showOriginal ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2 group-hover:-translate-y-0.5 transition-transform" />
                {t('summaries.buttons.hideOriginal')}
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2 group-hover:translate-y-0.5 transition-transform" />
                {t('summaries.buttons.showOriginal')}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            aria-label={t('summaries.buttons.copyText')}
            className="group"
          >
            <Copy className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
            {t('summaries.buttons.copyText')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            aria-label={t('summaries.buttons.copyLink')}
            className="group"
          >
            <Share2 className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
            {t('summaries.buttons.copyLink')}
          </Button>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          disabled={deleteSummary.isPending}
          aria-label="Supprimer le résumé"
          className="group"
        >
          <Trash2 className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
          {deleteSummary.isPending ? t('common.messages.deleting') : t('summaries.actions.delete')}
        </Button>
      </CardFooter>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('summaries.messages.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('summaries.messages.deleteConfirmMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
