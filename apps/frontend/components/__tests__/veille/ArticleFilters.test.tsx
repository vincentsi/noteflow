import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ArticleFilters } from '@/components/veille/ArticleFilters'
import type { GetArticlesParams } from '@/lib/api/articles'
import * as articlesApi from '@/lib/api/articles'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
}))

// Mock the articles API
jest.mock('@/lib/api/articles', () => ({
  articlesApi: {
    getSources: jest.fn(),
  },
}))

const mockGetSources = articlesApi.articlesApi.getSources as jest.MockedFunction<typeof articlesApi.articlesApi.getSources>

// Helper to render with React Query
const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('ArticleFilters', () => {
  beforeEach(() => {
    mockGetSources.mockResolvedValue(['TechCrunch', 'Hacker News', 'The Verge'])
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render source filter', async () => {
    const onChange = jest.fn()
    renderWithQueryClient(<ArticleFilters filters={{}} onChange={onChange} />)

    expect(screen.getByLabelText(/source/i)).toBeInTheDocument()

    // Wait for sources to load
    await waitFor(() => {
      expect(screen.getByText('TechCrunch')).toBeInTheDocument()
    })
  })

  it('should call onChange when source changes', async () => {
    const onChange = jest.fn()
    renderWithQueryClient(<ArticleFilters filters={{}} onChange={onChange} />)

    // Wait for sources to load
    await waitFor(() => {
      expect(screen.getByText('TechCrunch')).toBeInTheDocument()
    })

    const select = screen.getByLabelText(/source/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'TechCrunch' } })

    expect(onChange).toHaveBeenCalledWith({ source: 'TechCrunch' })
  })

  it('should show current source value', async () => {
    const onChange = jest.fn()
    const filters: GetArticlesParams = { source: 'Hacker News' }
    renderWithQueryClient(<ArticleFilters filters={filters} onChange={onChange} />)

    // Wait for sources to load
    await waitFor(() => {
      expect(screen.getByText('Hacker News')).toBeInTheDocument()
    })

    const select = screen.getByLabelText(/source/i) as HTMLSelectElement
    expect(select.value).toBe('Hacker News')
  })

  it('should allow clearing source filter', async () => {
    const onChange = jest.fn()
    const filters: GetArticlesParams = { source: 'TechCrunch' }
    renderWithQueryClient(<ArticleFilters filters={filters} onChange={onChange} />)

    // Wait for sources to load
    await waitFor(() => {
      expect(screen.getByText('TechCrunch')).toBeInTheDocument()
    })

    const select = screen.getByLabelText(/source/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: '' } })

    expect(onChange).toHaveBeenCalledWith({ source: undefined })
  })
})
