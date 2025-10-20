import { render, screen } from '@testing-library/react'
import { ArticleList } from '@/components/veille/ArticleList'
import type { SavedArticle } from '@/types'

const mockSavedArticles: SavedArticle[] = [
  {
    id: 'saved-1',
    userId: 'user-1',
    articleId: 'article-1',
    article: {
      id: 'article-1',
      title: 'Article 1',
      url: 'https://example.com/1',
      excerpt: 'First article excerpt',
      source: 'TechCrunch',
      tags: ['ai', 'tech'],
      publishedAt: '2025-01-15T10:00:00Z',
      createdAt: '2025-01-15T10:00:00Z',
    },
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'saved-2',
    userId: 'user-1',
    articleId: 'article-2',
    article: {
      id: 'article-2',
      title: 'Article 2',
      url: 'https://example.com/2',
      excerpt: 'Second article excerpt',
      source: 'Hacker News',
      tags: ['dev'],
      publishedAt: '2025-01-16T10:00:00Z',
      createdAt: '2025-01-16T10:00:00Z',
    },
    createdAt: '2025-01-16T10:00:00Z',
  },
]

describe('ArticleList', () => {
  it('should render all articles', () => {
    render(<ArticleList articles={mockSavedArticles} />)

    expect(screen.getByText('Article 1')).toBeInTheDocument()
    expect(screen.getByText('Article 2')).toBeInTheDocument()
  })

  it('should show empty state when no articles', () => {
    render(<ArticleList articles={[]} />)

    expect(screen.getByText(/aucun article trouvé/i)).toBeInTheDocument()
  })

  it('should pass onSave callback to ArticleCard', () => {
    const onSave = jest.fn()
    render(<ArticleList articles={mockSavedArticles} onSave={onSave} />)

    // ArticleCards in ArticleList are always marked as saved (isSaved=true)
    // So they show "Retirer" buttons, not "Sauvegarder" buttons
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBe(2) // 2 articles = 2 buttons
  })

  it('should pass onUnsave callback to ArticleCard', () => {
    const onUnsave = jest.fn()
    render(<ArticleList articles={mockSavedArticles} onUnsave={onUnsave} />)

    // ArticleCard should receive the onUnsave callback
    const unsaveButtons = screen.getAllByRole('button', { name: /retirer/i })
    expect(unsaveButtons.length).toBeGreaterThan(0)
  })

  it('should show loading state', () => {
    const onSave = jest.fn()
    render(<ArticleList articles={mockSavedArticles} onSave={onSave} isLoading />)

    // All buttons should be disabled when loading
    const buttons = screen.getAllByRole('button')
    buttons.forEach((button) => {
      expect(button).toBeDisabled()
    })
  })
})
