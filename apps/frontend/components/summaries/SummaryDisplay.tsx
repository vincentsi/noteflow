'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Copy, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useDeleteSummary } from '@/lib/hooks/useSummaries'

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

  return (
    <Card>
      {summary.coverImage && (
        <div className="relative w-full h-64 overflow-hidden rounded-t-lg">
          <Image
            src={summary.coverImage}
            alt={summary.title || 'Summary cover'}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {summary.title && <CardTitle className="text-2xl mb-2">{summary.title}</CardTitle>}
            <CardDescription>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {summary.style}
              </span>
              <span className="ml-3 text-muted-foreground">{formatDate(summary.createdAt)}</span>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary text */}
          <div className="prose prose-sm max-w-none">
            <p className="text-foreground whitespace-pre-wrap">{summary.summaryText}</p>
          </div>

          {/* Original text toggle section */}
          {showOriginal && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Texte original :</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summary.originalText}</p>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy} aria-label="Copier le résumé">
            <Copy className="h-4 w-4 mr-2" />
            Copier
          </Button>
          <Button variant="ghost" size="sm" onClick={toggleOriginal} aria-label="Afficher le texte original">
            {showOriginal ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Masquer l&apos;original
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Voir l&apos;original
              </>
            )}
          </Button>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleteSummary.isPending}
          aria-label="Supprimer le résumé"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {deleteSummary.isPending ? 'Suppression...' : 'Supprimer'}
        </Button>
      </CardFooter>
    </Card>
  )
}
