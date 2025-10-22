import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query'
import { summariesApi, type CreateSummaryParams, type CreateSummaryResponse, type SummaryStatusResponse } from '@/lib/api/summaries'
import { POLLING_CONFIG } from '@/lib/constants/api'

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
  return useQuery({
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
