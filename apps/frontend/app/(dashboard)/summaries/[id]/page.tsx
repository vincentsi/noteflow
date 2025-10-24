'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { summariesApi } from '@/lib/api/summaries'
import { SummaryDisplay } from '@/components/summaries/SummaryDisplay'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, ArrowLeft } from 'lucide-react'

export default function SummaryPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  // Fetch summary by ID
  const { data, isLoading, isError } = useQuery({
    queryKey: ['summary', id],
    queryFn: () => summariesApi.getSummaryById(id),
  })

  const summary = data?.data.summary

  // Redirect if summary not found
  useEffect(() => {
    if (isError) {
      router.push('/summaries')
    }
  }, [isError, router])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/summaries">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
        </div>
        <h1 className="text-3xl font-bold">Résumé</h1>
        <p className="text-muted-foreground">
          {summary ? 'Votre résumé généré' : 'Chargement...'}
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3 text-muted-foreground py-8">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Chargement...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Display Summary */}
      {summary && (
        <SummaryDisplay summary={summary} />
      )}
    </div>
  )
}
