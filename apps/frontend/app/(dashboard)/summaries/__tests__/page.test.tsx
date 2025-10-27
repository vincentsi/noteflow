import { render, screen, fireEvent } from '@testing-library/react'
import SummariesPage from '../page'
import { useAuth } from '@/providers/auth.provider'

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
  })),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}))

// Mock les hooks
jest.mock('@/providers/auth.provider')
jest.mock('@/lib/hooks/useSummaries', () => ({
  useCreateSummary: jest.fn(),
  useSummaryStatus: jest.fn(),
  useSummaries: jest.fn(),
}))

import { useCreateSummary, useSummaryStatus, useSummaries } from '@/lib/hooks/useSummaries'

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseCreateSummary = useCreateSummary as jest.MockedFunction<typeof useCreateSummary>
const mockUseSummaryStatus = useSummaryStatus as jest.MockedFunction<typeof useSummaryStatus>
const mockUseSummaries = useSummaries as jest.MockedFunction<typeof useSummaries>

describe('Summaries Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock user
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
        planType: 'FREE',
        language: 'fr',
        createdAt: new Date().toISOString(),
      },
      isAuthenticated: true,
      isLoading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
    })

    // Mock create summary mutation
    mockUseCreateSummary.mockReturnValue({
      mutate: jest.fn(),
      mutateAsync: jest.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      isIdle: true,
      data: undefined,
      error: null,
      reset: jest.fn(),
      status: 'idle',
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      isPaused: false,
      submittedAt: 0,
    } as ReturnType<typeof useCreateSummary>)

    // Mock summary status query
    mockUseSummaryStatus.mockReturnValue({
      data: undefined,
      isLoading: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useSummaryStatus>)

    // Mock summaries list query
    mockUseSummaries.mockReturnValue({
      data: {
        success: true,
        data: {
          summaries: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
          },
        },
      },
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useSummaries>)
  })

  it('should render form', () => {
    render(<SummariesPage />)

    expect(screen.getByPlaceholderText(/https:\/\/example.com\/article/i)).toBeInTheDocument()
  })

  it('should render page title', () => {
    render(<SummariesPage />)

    expect(screen.getByText(/PowerPost/i)).toBeInTheDocument()
  })

  it('should create summary on submit', async () => {
    const mutateMock = jest.fn()
    mockUseCreateSummary.mockReturnValue({
      mutate: mutateMock,
      isPending: false,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
    } as unknown as ReturnType<typeof useCreateSummary>)

    render(<SummariesPage />)

    const urlInput = screen.getByPlaceholderText(/https:\/\/example.com\/article/i)
    const testUrl = 'https://example.com/test-article'
    fireEvent.change(urlInput, { target: { value: testUrl } })

    const submitButton = screen.getByRole('button', { name: /générer/i })
    fireEvent.click(submitButton)

    expect(mutateMock).toHaveBeenCalled()
  })

  it('should show loading state during generation', () => {
    mockUseCreateSummary.mockReturnValue({
      mutate: jest.fn(),
      isPending: true,
      isSuccess: false,
      isError: false,
      data: undefined,
      error: null,
    } as unknown as ReturnType<typeof useCreateSummary>)

    render(<SummariesPage />)

    const loadingElements = screen.getAllByText(/génération en cours/i)
    expect(loadingElements.length).toBeGreaterThan(0)
  })

  it('should show summaries page title and form', () => {
    mockUseSummaries.mockReturnValue({
      data: {
        success: true,
        data: {
          summaries: [],
          total: 0,
          page: 1,
          limit: 10,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useSummaries>)

    render(<SummariesPage />)

    // Check that the page title is displayed
    expect(screen.getByText('PowerPost')).toBeInTheDocument()
  })

  it('should show history sidebar', () => {
    mockUseSummaries.mockReturnValue({
      data: {
        success: true,
        data: {
          summaries: [
            {
              id: 'summary-1',
              summaryText: 'Summary 1',
              originalText: 'Original 1',
              style: 'SHORT',
              title: null,
              source: null,
              language: 'fr',
              createdAt: new Date().toISOString(),
            },
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1,
          },
        },
      },
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useSummaries>)

    render(<SummariesPage />)

    expect(screen.getByText(/historique/i)).toBeInTheDocument()
  })

  it('should show plan usage', () => {
    render(<SummariesPage />)

    expect(screen.getByText(/utilisation du plan/i)).toBeInTheDocument()
  })
})
