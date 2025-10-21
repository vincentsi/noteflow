import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query'
import { summariesApi, type CreateSummaryParams, type CreateSummaryResponse, type SummaryStatusResponse } from '@/lib/api/summaries'

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
 * Automatically polls every 2 seconds until status is 'completed' or 'failed'
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
      // Poll every 2 seconds for pending/active jobs
      return 2000
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
