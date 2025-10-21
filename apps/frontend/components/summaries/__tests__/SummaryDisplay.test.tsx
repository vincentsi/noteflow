import { render, screen, fireEvent } from '@testing-library/react'
import { SummaryDisplay } from '../SummaryDisplay'

const mockSummary = {
  id: 'summary-1',
  summaryText: 'This is a summary.',
  originalText: 'Long original text that should be toggled on and off.',
  style: 'SHORT' as const,
  title: null,
  source: null,
  language: 'fr',
  createdAt: '2025-01-15T10:00:00.000Z',
}

describe('SummaryDisplay', () => {
  it('should render summary text', () => {
    render(<SummaryDisplay summary={mockSummary} />)

    expect(screen.getByText('This is a summary.')).toBeInTheDocument()
  })

  it('should show style badge', () => {
    render(<SummaryDisplay summary={mockSummary} />)

    expect(screen.getByText('SHORT')).toBeInTheDocument()
  })

  it('should have copy button', () => {
    render(<SummaryDisplay summary={mockSummary} />)

    expect(screen.getByRole('button', { name: /copier/i })).toBeInTheDocument()
  })

  it('should toggle original text', () => {
    render(<SummaryDisplay summary={mockSummary} />)

    // Original text should not be visible initially
    expect(screen.queryByText('Long original text that should be toggled on and off.')).not.toBeInTheDocument()

    const toggleButton = screen.getByRole('button', { name: /original/i })
    fireEvent.click(toggleButton)

    // Now it should be visible
    expect(screen.getByText('Long original text that should be toggled on and off.')).toBeInTheDocument()
  })

  it('should hide original text when toggled off', () => {
    render(<SummaryDisplay summary={mockSummary} />)

    const toggleButton = screen.getByRole('button', { name: /original/i })

    // Show original text
    fireEvent.click(toggleButton)
    expect(screen.getByText('Long original text that should be toggled on and off.')).toBeInTheDocument()

    // Hide original text
    fireEvent.click(toggleButton)
    expect(screen.queryByText('Long original text that should be toggled on and off.')).not.toBeInTheDocument()
  })

  it('should copy summary text to clipboard when copy button clicked', async () => {
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    })

    render(<SummaryDisplay summary={mockSummary} />)

    const copyButton = screen.getByRole('button', { name: /copier/i })
    fireEvent.click(copyButton)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('This is a summary.')
  })

  it('should show created date', () => {
    render(<SummaryDisplay summary={mockSummary} />)

    // Date should be formatted (e.g., "Jan 15, 2025")
    expect(screen.getByText(/jan 15, 2025/i)).toBeInTheDocument()
  })

  it('should display title if provided', () => {
    const summaryWithTitle = { ...mockSummary, title: 'My Summary Title' }
    render(<SummaryDisplay summary={summaryWithTitle} />)

    expect(screen.getByText('My Summary Title')).toBeInTheDocument()
  })
})
