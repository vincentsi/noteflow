import { render, screen } from '@testing-library/react'
import { ArticleCard } from '../../veille/ArticleCard'
import type { Article } from '@/types'

const mockArticle: Article = {
  id: 'article-1',
  title: 'Test Article Title',
  url: 'https://example.com/article',
  excerpt: 'This is a test excerpt for the article',
  source: 'TechCrunch',
  tags: ['ai', 'dev', 'startup'],
  publishedAt: new Date('2025-01-15').toISOString(),
  createdAt: new Date('2025-01-15').toISOString(),
}

describe('ArticleCard', () => {
  it('renders article title', () => {
    render(<ArticleCard article={mockArticle} />)

    expect(screen.getByText('Test Article Title')).toBeInTheDocument()
  })

  it('renders article excerpt', () => {
    render(<ArticleCard article={mockArticle} />)

    expect(screen.getByText('This is a test excerpt for the article')).toBeInTheDocument()
  })

  it('renders article source', () => {
    render(<ArticleCard article={mockArticle} />)

    expect(screen.getByText('TechCrunch')).toBeInTheDocument()
  })

  it('renders all article tags', () => {
    render(<ArticleCard article={mockArticle} />)

    expect(screen.getByText('ai')).toBeInTheDocument()
    expect(screen.getByText('dev')).toBeInTheDocument()
    expect(screen.getByText('startup')).toBeInTheDocument()
  })

  it('renders link to article with correct href', () => {
    render(<ArticleCard article={mockArticle} />)

    const link = screen.getByRole('link', { name: /test article title/i })
    expect(link).toHaveAttribute('href', 'https://example.com/article')
  })

  it('opens link in new tab', () => {
    render(<ArticleCard article={mockArticle} />)

    const link = screen.getByRole('link', { name: /test article title/i })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('shows save button when not saved', () => {
    const onSave = jest.fn()
    render(<ArticleCard article={mockArticle} isSaved={false} onSave={onSave} />)

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('shows unsave button when saved', () => {
    const onUnsave = jest.fn()
    render(<ArticleCard article={mockArticle} isSaved={true} onUnsave={onUnsave} />)

    const button = screen.getByRole('button', { name: /unsave article/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent('Saved')
  })

  it('renders published date', () => {
    render(<ArticleCard article={mockArticle} />)

    // Should display date in some format (e.g., "Jan 15, 2025" or relative like "10 days ago")
    expect(screen.getByText(/jan|15|2025/i)).toBeInTheDocument()
  })
})
