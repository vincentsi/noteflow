'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, ChevronDown, ChevronUp, Trash2, Share2, FileText, MessageSquare, List, Trophy, Lightbulb, Hash, BarChart3 } from 'lucide-react'
import { toast } from 'sonner'
import { useDeleteSummary } from '@/lib/hooks/useSummaries'
import { cn } from '@/lib/utils'

// Style badges configuration with icons and colors
const STYLE_CONFIG = {
  SHORT: { icon: FileText, label: 'Court', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400' },
  TWEET: { icon: Hash, label: 'Tweet', color: 'bg-sky-500/10 text-sky-700 border-sky-500/20 dark:text-sky-400' },
  THREAD: { icon: MessageSquare, label: 'Thread', color: 'bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-400' },
  BULLET_POINT: { icon: List, label: 'Points clés', color: 'bg-green-500/10 text-green-700 border-green-500/20 dark:text-green-400' },
  TOP3: { icon: Trophy, label: 'Top 3', color: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400' },
  MAIN_POINTS: { icon: Lightbulb, label: 'Points principaux', color: 'bg-orange-500/10 text-orange-700 border-orange-500/20 dark:text-orange-400' },
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
  const router = useRouter()
  const deleteSummary = useDeleteSummary()

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary.summaryText)
      toast.success('Résumé copié dans le presse-papiers')
    } catch {
      toast.error('Erreur lors de la copie')
    }
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Lien copié dans le presse-papiers')
    } catch {
      toast.error('Erreur lors de la copie du lien')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce résumé ?\n\nNote: Votre quota mensuel ne changera pas, car il est basé sur le nombre de résumés créés, pas sur ceux existants.')) {
      return
    }

    deleteSummary.mutate(summary.id, {
      onSuccess: () => {
        toast.success('Résumé supprimé avec succès')
        router.push('/summaries')
      },
      onError: () => {
        toast.error('Erreur lors de la suppression du résumé')
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

  const styleConfig = STYLE_CONFIG[summary.style as keyof typeof STYLE_CONFIG]
  const StyleIcon = styleConfig?.icon || FileText

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
              {styleConfig && (
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shrink-0 shadow-sm border",
                  styleConfig.color
                )}>
                  <StyleIcon className="h-3.5 w-3.5" />
                  {styleConfig.label}
                </span>
              )}
              <span className="text-muted-foreground text-sm">{formatDate(summary.createdAt)}</span>
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border",
                "bg-gradient-to-r from-emerald-500/10 to-teal-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400"
              )}>
                <BarChart3 className="h-3.5 w-3.5" />
                {compressionRate}% de compression
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
              <div className="text-xs text-muted-foreground mt-1">Caractères originaux</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summaryLength.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">Caractères résumés</div>
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
                <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Texte original</h4>
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
            aria-label="Afficher le texte original"
            className="group"
          >
            {showOriginal ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2 group-hover:-translate-y-0.5 transition-transform" />
                Masquer l&apos;original
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2 group-hover:translate-y-0.5 transition-transform" />
                Voir l&apos;original
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            aria-label="Copier le résumé"
            className="group"
          >
            <Copy className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
            Copier le texte
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            aria-label="Partager le résumé"
            className="group"
          >
            <Share2 className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
            Copier le lien
          </Button>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleteSummary.isPending}
          aria-label="Supprimer le résumé"
          className="group"
        >
          <Trash2 className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
          {deleteSummary.isPending ? 'Suppression...' : 'Supprimer'}
        </Button>
      </CardFooter>
    </Card>
  )
}
