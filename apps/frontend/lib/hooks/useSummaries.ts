import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query'
import { summariesApi, type CreateSummaryParams, type CreateSummaryResponse, type SummaryStatusResponse } from '@/lib/api/summaries'
import { POLLING_CONFIG } from '@/lib/constants/api'
import { useEffect, useRef } from 'react'

/**
 * Hook to create a new summary
 */
export function useCreateSummary(): UseMutationResult<CreateSummaryResponse, Error, CreateSummaryParams> {
  return useMutation({
    mutationFn: (params: CreateSummaryParams) => summariesApi.createSummary(params),
  })
}

/**
 * Hook to poll summary job status
 * Uses exponential backoff to reduce server load:
 * - Starts at 1s, doubles each time (1s → 2s → 4s → 8s)
 * - Max interval: 10s
 * - Stops when completed/failed
 * - Job of 5min: ~50 requests (vs 150 with fixed 2s polling)
 */
export function useSummaryStatus(jobId: string | null): UseQueryResult<SummaryStatusResponse, Error> {
  const queryClient = useQueryClient()
  const hasInvalidatedRef = useRef(false)

  const query = useQuery({
    queryKey: ['summary-status', jobId],
    queryFn: () => {
      if (!jobId) {
        throw new Error('Job ID is required')
      }
      return summariesApi.getSummaryStatus(jobId)
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.data.status

      // Stop polling if completed or failed
      if (status === 'completed' || status === 'failed') {
        return false
      }

      // Exponential backoff with configurable intervals
      const attempt = query.state.dataUpdateCount
      const interval = Math.min(
        POLLING_CONFIG.INITIAL_INTERVAL_MS *
          Math.pow(POLLING_CONFIG.BACKOFF_MULTIPLIER, attempt),
        POLLING_CONFIG.MAX_INTERVAL_MS
      )

      return interval
    },
    refetchIntervalInBackground: false,
  })

  // Invalidate summaries query when status becomes completed
  useEffect(() => {
    if (query.data?.data.status === 'completed' && !hasInvalidatedRef.current) {
      hasInvalidatedRef.current = true
      void queryClient.invalidateQueries({ queryKey: ['summaries'] })
      void queryClient.invalidateQueries({ queryKey: ['user-stats'] })
    }
  }, [query.data?.data.status, queryClient])

  // Reset invalidation flag when jobId changes
  useEffect(() => {
    hasInvalidatedRef.current = false
  }, [jobId])

  return query
}

/**
 * Hook to get user's summary history
 */
export function useSummaries(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['summaries', params],
    queryFn: () => summariesApi.getSummaries(params),
  })
}

/**
 * Hook to delete a summary
 */
export function useDeleteSummary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (summaryId: string) => summariesApi.deleteSummary(summaryId),
    onSuccess: () => {
      // Invalidate summaries list and user stats
      void queryClient.invalidateQueries({ queryKey: ['summaries'] })
      void queryClient.invalidateQueries({ queryKey: ['user-stats'] })
    },
  })
}

/**
 * Hook to create a summary from an existing note
 */
export function useCreateSummaryFromNote() {
  return useMutation({
    mutationFn: (params: { noteId: string; style: import('@/lib/api/summaries').SummaryStyle; language?: 'fr' | 'en' }) =>
      summariesApi.createSummaryFromNote(params),
  })
}
