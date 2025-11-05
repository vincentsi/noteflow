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
import { Copy, ChevronDown, ChevronUp, Trash2, Share2, FileText, MessageSquare, List, Trophy, Lightbulb, Hash, BarChart3, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { useDeleteSummary } from '@/lib/hooks/useSummaries'
import { useCreateNoteFromSummary } from '@/lib/hooks/useNotes'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/provider'

// Style badges configuration with icons (simplified, no colors)
const STYLE_ICON_CONFIG = {
  SHORT: { icon: FileText },
  TWEET: { icon: Hash },
  THREAD: { icon: MessageSquare },
  BULLET_POINT: { icon: List },
  TOP3: { icon: Trophy },
  MAIN_POINTS: { icon: Lightbulb },
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
  const createNote = useCreateNoteFromSummary()
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

  const handleImportToNote = () => {
    createNote.mutate(summary.id, {
      onSuccess: () => {
        toast.success(t('summaries.messages.importSuccess'))
        router.push('/notes')
      },
      onError: () => {
        toast.error(t('summaries.messages.importError'))
      },
    })
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
    <Card className="overflow-hidden">
      {summary.coverImage && (
        <div className="relative w-full h-64 overflow-hidden">
          <Image
            src={summary.coverImage}
            alt={summary.title || 'Summary cover'}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {summary.title && (
              <CardTitle className="text-2xl font-bold text-foreground">
                {summary.title}
              </CardTitle>
            )}
            <CardDescription className="flex flex-wrap items-center gap-2">
              {styleIconConfig && (
                <span className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium shrink-0 border border-border bg-background">
                  <StyleIcon className="h-3.5 w-3.5" />
                  {styleLabel}
                </span>
              )}
              <span className="text-muted-foreground text-sm">{formatDate(summary.createdAt)}</span>
              <span className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs font-medium border border-border bg-background">
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
            <div className="p-4 rounded-md bg-muted border-l-2 border-primary">
              <p className="text-foreground whitespace-pre-wrap leading-relaxed text-sm">
                {summary.summaryText}
              </p>
            </div>
          </div>

          {/* Stats card */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-md bg-muted border border-border">
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">{originalLength.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">{t('summaries.messages.originalChars')}</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-foreground">{summaryLength.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">{t('summaries.messages.summarizedChars')}</div>
            </div>
          </div>

          {/* Original text toggle section with animation */}
          <div className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            showOriginal ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
          )}>
            <div className="p-4 bg-muted rounded-md border border-border">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-foreground">{t('summaries.messages.originalText')}</h4>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {summary.originalText}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 justify-between border-t">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleOriginal}
            aria-label={showOriginal ? t('summaries.buttons.hideOriginal') : t('summaries.buttons.showOriginal')}
          >
            {showOriginal ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                {t('summaries.buttons.hideOriginal')}
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                {t('summaries.buttons.showOriginal')}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            aria-label={t('summaries.buttons.copyText')}
          >
            <Copy className="h-4 w-4 mr-2" />
            {t('summaries.buttons.copyText')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            aria-label={t('summaries.buttons.copyLink')}
          >
            <Share2 className="h-4 w-4 mr-2" />
            {t('summaries.buttons.copyLink')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportToNote}
            disabled={createNote.isPending}
            aria-label={t('summaries.buttons.importToNote')}
          >
            <FileDown className="h-4 w-4 mr-2" />
            {createNote.isPending ? t('summaries.buttons.importing') : t('summaries.buttons.importToNote')}
          </Button>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          disabled={deleteSummary.isPending}
          aria-label="Supprimer le résumé"
        >
          <Trash2 className="h-4 w-4 mr-2" />
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
