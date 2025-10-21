import { renderHook, waitFor } from '@testing-library/react'
import { useCreateSummary } from '../useSummaries'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Mock the summaries API
jest.mock('@/lib/api/summaries', () => ({
  summariesApi: {
    createSummary: jest.fn(),
  },
}))

import { summariesApi } from '@/lib/api/summaries'

const mockSummariesApi = summariesApi as jest.Mocked<typeof summariesApi>

describe('useCreateSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
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

  it('should create summary with text and return jobId', async () => {
    const mockResponse = {
      success: true,
      data: {
        jobId: 'job-123',
        message: 'Summary generation job created',
      },
    }

    mockSummariesApi.createSummary.mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useCreateSummary(), {
      wrapper: createWrapper(),
    })

    // Trigger mutation
    result.current.mutate({
      text: 'This is a long text that needs to be summarized with AI tools',
      style: 'SHORT',
    })

    // Wait for success
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)
    expect(mockSummariesApi.createSummary).toHaveBeenCalledWith({
      text: 'This is a long text that needs to be summarized with AI tools',
      style: 'SHORT',
    })
  })

  it('should create summary with PDF file', async () => {
    const mockResponse = {
      success: true,
      data: {
        jobId: 'job-456',
        message: 'Summary generation job created',
      },
    }

    mockSummariesApi.createSummary.mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useCreateSummary(), {
      wrapper: createWrapper(),
    })

    const file = new File(['dummy pdf content'], 'test.pdf', { type: 'application/pdf' })

    result.current.mutate({
      file,
      style: 'TWEET',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockResponse)
    // Should be called with file
    expect(mockSummariesApi.createSummary).toHaveBeenCalledWith({
      file,
      style: 'TWEET',
    })
  })

  it('should include language parameter if provided', async () => {
    const mockResponse = {
      success: true,
      data: { jobId: 'job-789' },
    }

    mockSummariesApi.createSummary.mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useCreateSummary(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      text: 'Text to summarize in English',
      style: 'BULLET_POINT',
      language: 'en',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockSummariesApi.createSummary).toHaveBeenCalledWith({
      text: 'Text to summarize in English',
      style: 'BULLET_POINT',
      language: 'en',
    })
  })

  it('should handle plan limit error (403)', async () => {
    const error = {
      response: {
        status: 403,
        data: {
          success: false,
          error: 'Plan limit reached',
          message: 'Summary limit reached. Your FREE plan allows 5 summaries per month.',
        },
      },
    }

    mockSummariesApi.createSummary.mockRejectedValue(error)

    const { result } = renderHook(() => useCreateSummary(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      text: 'Text to summarize',
      style: 'SHORT',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(error)
  })

  it('should handle validation error (400)', async () => {
    const error = {
      response: {
        status: 400,
        data: {
          success: false,
          error: 'Validation error',
        },
      },
    }

    mockSummariesApi.createSummary.mockRejectedValue(error)

    const { result } = renderHook(() => useCreateSummary(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      text: 'Short',
      style: 'SHORT',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(error)
  })

  it('should handle network error', async () => {
    const error = new Error('Network error')
    mockSummariesApi.createSummary.mockRejectedValue(error)

    const { result } = renderHook(() => useCreateSummary(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      text: 'Text to summarize',
      style: 'SHORT',
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(error)
  })

  it('should expose loading state during mutation', async () => {
    mockSummariesApi.createSummary.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true, data: { jobId: 'job-999' } }), 100))
    )

    const { result } = renderHook(() => useCreateSummary(), {
      wrapper: createWrapper(),
    })

    // Initially not pending
    expect(result.current.isPending).toBe(false)

    result.current.mutate({
      text: 'Text to summarize',
      style: 'SHORT',
    })

    // Should transition to pending state
    await waitFor(() => expect(result.current.isPending).toBe(true))

    // Then transition to success
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // Finally not pending anymore
    expect(result.current.isPending).toBe(false)
  })
})
