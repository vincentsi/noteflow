import { renderHook, waitFor } from '@testing-library/react'
import { useSummaryStatus } from '../useSummaries'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Mock the summaries API
jest.mock('@/lib/api/summaries', () => ({
  summariesApi: {
    getSummaryStatus: jest.fn(),
  },
}))

import { summariesApi } from '@/lib/api/summaries'

const mockSummariesApi = summariesApi as jest.Mocked<typeof summariesApi>

describe('useSummaryStatus - Polling', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    Wrapper.displayName = 'QueryClientWrapper'

    return Wrapper
  }

  it('should poll job status until completed', async () => {
    let callCount = 0
    mockSummariesApi.getSummaryStatus.mockImplementation(() => {
      callCount++
      if (callCount < 3) {
        return Promise.resolve({
          success: true,
          data: {
            status: 'waiting' as const,
            jobId: 'job-123',
          },
        })
      }
      return Promise.resolve({
        success: true,
        data: {
          status: 'completed' as const,
          summary: {
            id: 'summary-1',
            title: null,
            coverImage: null,
            originalText: 'Original text',
            summaryText: 'This is a summary.',
            style: 'SHORT' as const,
            source: null,
            language: 'fr',
            createdAt: new Date().toISOString(),
          },
        },
      })
    })

    const { result } = renderHook(() => useSummaryStatus('job-123'), {
      wrapper: createWrapper(),
    })

    // Wait for completed status
    await waitFor(
      () => {
        expect(result.current.data?.data.status).toBe('completed')
      },
      { timeout: 10000 }
    )

    // Should have called API multiple times
    expect(callCount).toBeGreaterThanOrEqual(3)
  }, 15000) // Increase test timeout to 15 seconds

  it('should stop polling when status is completed', async () => {
    mockSummariesApi.getSummaryStatus.mockResolvedValue({
      success: true,
      data: {
        status: 'completed',
        summary: {
          id: 'summary-1',
          title: null,
          coverImage: null,
          originalText: 'Original text',
          summaryText: 'Summary text',
          style: 'SHORT',
          source: null,
          language: 'fr',
          createdAt: new Date().toISOString(),
        },
      },
    })

    const { result } = renderHook(() => useSummaryStatus('job-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const initialCallCount = mockSummariesApi.getSummaryStatus.mock.calls.length

    // Wait 3 seconds
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Should not have made additional calls
    expect(mockSummariesApi.getSummaryStatus.mock.calls.length).toBe(initialCallCount)
  })

  it('should stop polling when status is failed', async () => {
    mockSummariesApi.getSummaryStatus.mockResolvedValue({
      success: true,
      data: {
        status: 'failed',
        jobId: 'job-123',
      },
    })

    const { result } = renderHook(() => useSummaryStatus('job-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.data?.data.status).toBe('failed'))

    const initialCallCount = mockSummariesApi.getSummaryStatus.mock.calls.length

    // Wait 3 seconds
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Should not have made additional calls
    expect(mockSummariesApi.getSummaryStatus.mock.calls.length).toBe(initialCallCount)
  })

  it('should not fetch when jobId is null', () => {
    const { result } = renderHook(() => useSummaryStatus(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.status).toBe('pending')
    expect(result.current.fetchStatus).toBe('idle')
    expect(mockSummariesApi.getSummaryStatus).not.toHaveBeenCalled()
  })

  it('should handle errors during polling', async () => {
    const error = new Error('Network error')
    mockSummariesApi.getSummaryStatus.mockRejectedValue(error)

    const { result } = renderHook(() => useSummaryStatus('job-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(error)
  })

  it('should poll every 2 seconds for waiting status', async () => {
    mockSummariesApi.getSummaryStatus.mockResolvedValue({
      success: true,
      data: {
        status: 'waiting',
        jobId: 'job-123',
      },
    })

    const { result } = renderHook(() => useSummaryStatus('job-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const initialCallCount = mockSummariesApi.getSummaryStatus.mock.calls.length

    // Wait 2.5 seconds (should trigger at least one more call)
    await new Promise((resolve) => setTimeout(resolve, 2500))

    // Should have made at least one more call
    expect(mockSummariesApi.getSummaryStatus.mock.calls.length).toBeGreaterThan(initialCallCount)
  })

  it('should poll every 2 seconds for active status', async () => {
    mockSummariesApi.getSummaryStatus.mockResolvedValue({
      success: true,
      data: {
        status: 'active',
        jobId: 'job-123',
      },
    })

    const { result } = renderHook(() => useSummaryStatus('job-123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const initialCallCount = mockSummariesApi.getSummaryStatus.mock.calls.length

    // Wait 2.5 seconds (should trigger at least one more call)
    await new Promise((resolve) => setTimeout(resolve, 2500))

    // Should have made at least one more call
    expect(mockSummariesApi.getSummaryStatus.mock.calls.length).toBeGreaterThan(initialCallCount)
  })
})
