import { render, screen, fireEvent } from '@testing-library/react'
import { ArticleFilters } from '@/components/veille/ArticleFilters'
import type { GetSavedArticlesParams } from '@/lib/api/articles'

describe('ArticleFilters', () => {
  it('should render source filter', () => {
    const onChange = jest.fn()
    render(<ArticleFilters filters={{}} onChange={onChange} />)

    expect(screen.getByLabelText(/source/i)).toBeInTheDocument()
  })

  it('should call onChange when source changes', () => {
    const onChange = jest.fn()
    render(<ArticleFilters filters={{}} onChange={onChange} />)

    const select = screen.getByLabelText(/source/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'TechCrunch' } })

    expect(onChange).toHaveBeenCalledWith({ source: 'TechCrunch' })
  })

  it('should show current source value', () => {
    const onChange = jest.fn()
    const filters: GetSavedArticlesParams = { source: 'Hacker News' }
    render(<ArticleFilters filters={filters} onChange={onChange} />)

    const select = screen.getByLabelText(/source/i) as HTMLSelectElement
    expect(select.value).toBe('Hacker News')
  })

  it('should allow clearing source filter', () => {
    const onChange = jest.fn()
    const filters: GetSavedArticlesParams = { source: 'TechCrunch' }
    render(<ArticleFilters filters={filters} onChange={onChange} />)

    const select = screen.getByLabelText(/source/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: '' } })

    expect(onChange).toHaveBeenCalledWith({ source: undefined })
  })
})
