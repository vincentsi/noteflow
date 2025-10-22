import { render, screen } from '@testing-library/react'
import { ArticleList } from '@/components/veille/ArticleList'
import type { Article } from '@/types'

const mockArticles: Article[] = [
  {
    id: 'article-1',
    title: 'Article 1',
    url: 'https://example.com/1',
    excerpt: 'First article excerpt',
    source: 'TechCrunch',
    tags: ['ai', 'tech'],
    publishedAt: '2025-01-15T10:00:00Z',
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'article-2',
    title: 'Article 2',
    url: 'https://example.com/2',
    excerpt: 'Second article excerpt',
    source: 'Hacker News',
    tags: ['dev'],
    publishedAt: '2025-01-16T10:00:00Z',
    createdAt: '2025-01-16T10:00:00Z',
  },
]

describe('ArticleList', () => {
  it('should render all articles', () => {
    render(<ArticleList articles={mockArticles} />)

    expect(screen.getByText('Article 1')).toBeInTheDocument()
    expect(screen.getByText('Article 2')).toBeInTheDocument()
  })

  it('should show empty state when no articles', () => {
    render(<ArticleList articles={[]} />)

    expect(screen.getByText(/aucun article trouvé/i)).toBeInTheDocument()
  })

  it('should pass onSave callback to ArticleCard', () => {
    const onSave = jest.fn()
    render(<ArticleList articles={mockArticles} onSave={onSave} />)

    // Articles are not saved by default, so they show "Sauvegarder" buttons
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(2) // 2 articles = 2 buttons
  })

  it('should pass onUnsave callback to ArticleCard with saved articles', () => {
    const onUnsave = jest.fn()
    const savedIds = new Set(['article-1', 'article-2'])
    render(<ArticleList articles={mockArticles} savedArticleIds={savedIds} onUnsave={onUnsave} />)

    // ArticleCard should receive the onUnsave callback
    const unsaveButtons = screen.getAllByRole('button', { name: /retirer/i })
    expect(unsaveButtons.length).toBeGreaterThan(0)
  })

  it('should show loading state', () => {
    const onSave = jest.fn()
    render(<ArticleList articles={mockArticles} onSave={onSave} isLoading />)

    // All buttons should be disabled when loading
    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })
})
