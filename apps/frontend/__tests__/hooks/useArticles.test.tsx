import { renderHook, waitFor } from '@testing-library/react'
import { useArticles } from '@/lib/hooks/useArticles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// Mock the articles API
jest.mock('@/lib/api/articles', () => ({
  articlesApi: {
    getSavedArticles: jest.fn(),
  },
}))

import { articlesApi } from '@/lib/api/articles'

const mockArticlesApi = articlesApi as jest.Mocked<typeof articlesApi>

describe('useArticles', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries for tests
        },
      },
    })

    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    Wrapper.displayName = 'QueryClientWrapper'

    return Wrapper
  }

  it('should fetch saved articles successfully', async () => {
    const mockArticles = [
      {
        id: 'saved-1',
        userId: 'user-1',
        articleId: 'article-1',
        createdAt: '2025-01-15T00:00:00.000Z',
        article: {
          id: 'article-1',
          title: 'Article 1',
          url: 'https://example.com/1',
          excerpt: 'Excerpt 1',
          source: 'TechCrunch',
          tags: ['ai'],
          publishedAt: '2025-01-15T00:00:00.000Z',
          createdAt: '2025-01-15T00:00:00.000Z',
        },
      },
      {
        id: 'saved-2',
        userId: 'user-1',
        articleId: 'article-2',
        createdAt: '2025-01-14T00:00:00.000Z',
        article: {
          id: 'article-2',
          title: 'Article 2',
          url: 'https://example.com/2',
          excerpt: 'Excerpt 2',
          source: 'Hacker News',
          tags: ['dev'],
          publishedAt: '2025-01-14T00:00:00.000Z',
          createdAt: '2025-01-14T00:00:00.000Z',
        },
      },
    ]

    mockArticlesApi.getSavedArticles.mockResolvedValue(mockArticles)

    const { result } = renderHook(() => useArticles(), {
      wrapper: createWrapper(),
    })

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    // Wait for success
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data?.[0].article.title).toBe('Article 1')
    expect(result.current.data?.[1].article.title).toBe('Article 2')
    expect(mockArticlesApi.getSavedArticles).toHaveBeenCalledWith(undefined)
  })

  it('should apply source filter', async () => {
    mockArticlesApi.getSavedArticles.mockResolvedValue([])

    const { result } = renderHook(() => useArticles({ source: 'TechCrunch' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockArticlesApi.getSavedArticles).toHaveBeenCalledWith({
      source: 'TechCrunch',
    })
  })

  it('should apply pagination filters', async () => {
    mockArticlesApi.getSavedArticles.mockResolvedValue([])

    const { result } = renderHook(
      () => useArticles({ skip: 10, take: 20 }),
      {
        wrapper: createWrapper(),
      }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockArticlesApi.getSavedArticles).toHaveBeenCalledWith({
      skip: 10,
      take: 20,
    })
  })

  it('should handle errors', async () => {
    const error = new Error('Failed to fetch articles')
    mockArticlesApi.getSavedArticles.mockRejectedValue(error)

    const { result } = renderHook(() => useArticles(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toEqual(error)
  })
})
