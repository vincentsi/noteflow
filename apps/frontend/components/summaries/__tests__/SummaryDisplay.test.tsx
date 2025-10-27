import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SummaryDisplay } from '../SummaryDisplay'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}))

// Create a test query client
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

// Wrapper component
function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

const mockSummary = {
  id: 'summary-1',
  summaryText: 'This is a summary.',
  originalText: 'Long original text that should be toggled on and off.',
  style: 'SHORT' as const,
  title: null,
  coverImage: null,
  source: null,
  language: 'fr',
  createdAt: '2025-01-15T10:00:00.000Z',
}

describe('SummaryDisplay', () => {
  it('should render summary text', () => {
    render(<SummaryDisplay summary={mockSummary} />, { wrapper: Wrapper })

    expect(screen.getByText('This is a summary.')).toBeInTheDocument()
  })

  it('should show style badge', () => {
    render(<SummaryDisplay summary={mockSummary} />, { wrapper: Wrapper })

    expect(screen.getByText('SHORT')).toBeInTheDocument()
  })

  it('should have copy button', () => {
    render(<SummaryDisplay summary={mockSummary} />, { wrapper: Wrapper })

    expect(screen.getByRole('button', { name: /copier/i })).toBeInTheDocument()
  })

  it('should toggle original text', () => {
    render(<SummaryDisplay summary={mockSummary} />, { wrapper: Wrapper })

    // Original text should not be visible initially
    expect(screen.queryByText('Long original text that should be toggled on and off.')).not.toBeInTheDocument()

    const toggleButton = screen.getByRole('button', { name: /original/i })
    fireEvent.click(toggleButton)

    // Now it should be visible
    expect(screen.getByText('Long original text that should be toggled on and off.')).toBeInTheDocument()
  })

  it('should hide original text when toggled off', () => {
    render(<SummaryDisplay summary={mockSummary} />, { wrapper: Wrapper })

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

    render(<SummaryDisplay summary={mockSummary} />, { wrapper: Wrapper })

    const copyButton = screen.getByRole('button', { name: /copier/i })
    fireEvent.click(copyButton)

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('This is a summary.')
  })

  it('should show created date', () => {
    render(<SummaryDisplay summary={mockSummary} />, { wrapper: Wrapper })

    // Date should be formatted (e.g., "Jan 15, 2025")
    expect(screen.getByText(/jan 15, 2025/i)).toBeInTheDocument()
  })

  it('should display title if provided', () => {
    const summaryWithTitle = { ...mockSummary, title: 'My Summary Title' }
    render(<SummaryDisplay summary={summaryWithTitle} />, { wrapper: Wrapper })

    expect(screen.getByText('My Summary Title')).toBeInTheDocument()
  })
})
