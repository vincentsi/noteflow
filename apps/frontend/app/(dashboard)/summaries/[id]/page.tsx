'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { summariesApi } from '@/lib/api/summaries'
import { SummaryDisplay } from '@/components/summaries/SummaryDisplay'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

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
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/summaries')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Résumé
        </h1>
        <p className="text-muted-foreground mt-2">
          {summary ? summary.title || 'Votre résumé généré' : 'Chargement de votre résumé...'}
        </p>
      </div>

      {/* Loading State - Skeleton */}
      {isLoading && (
        <Card className="shadow-xl border-2 overflow-hidden animate-pulse">
          {/* Cover image skeleton */}
          <div className="w-full h-72 bg-muted" />

          {/* Header skeleton */}
          <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent space-y-4">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="flex gap-3">
              <div className="h-6 w-24 bg-muted rounded-full" />
              <div className="h-6 w-32 bg-muted rounded-full" />
              <div className="h-6 w-28 bg-muted rounded-full" />
            </div>
          </CardHeader>

          {/* Content skeleton */}
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-3/4" />
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border">
              <div className="h-16 bg-muted rounded" />
              <div className="h-16 bg-muted rounded" />
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
