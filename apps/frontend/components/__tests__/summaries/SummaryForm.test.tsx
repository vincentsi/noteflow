import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SummaryForm } from '../../summaries/SummaryForm'

describe('SummaryForm', () => {
  it('should render source selector with URL and PDF options', () => {
    render(<SummaryForm onSubmit={jest.fn()} />)

    // Should show both source options as buttons
    const urlElements = screen.getAllByText(/url/i)
    const pdfElements = screen.getAllByText(/pdf/i)

    expect(urlElements.length).toBeGreaterThan(0)
    expect(pdfElements.length).toBeGreaterThan(0)
  })

  it('should show URL input when url source is selected', () => {
    render(<SummaryForm onSubmit={jest.fn()} />)

    // URL should be selected by default
    const urlInput = screen.getByPlaceholderText(/https:\/\/example.com\/article/i)
    expect(urlInput).toBeInTheDocument()
    expect(urlInput).toHaveAttribute('type', 'url')
  })

  it('should show file input when PDF source is selected', () => {
    render(<SummaryForm onSubmit={jest.fn()} />)

    // Click on PDF tab
    const pdfButton = screen.getByText(/pdf/i)
    fireEvent.click(pdfButton)

    // Should show file input
    const fileInput = screen.getByLabelText(/fichier pdf/i)
    expect(fileInput).toBeInTheDocument()
    expect(fileInput).toHaveAttribute('type', 'file')
    expect(fileInput).toHaveAttribute('accept', '.pdf')
  })

  it('should render StyleSelector component', () => {
    render(<SummaryForm onSubmit={jest.fn()} />)

    // Should show all 7 style buttons
    const styleButtons = screen.getAllByRole('button').filter(btn => btn.getAttribute('aria-pressed') !== null)
    expect(styleButtons.length).toBe(7)
  })

  it('should disable submit button when no URL provided', () => {
    render(<SummaryForm onSubmit={jest.fn()} />)

    const submitButton = screen.getByRole('button', { name: /générer/i })
    expect(submitButton).toBeDisabled()
  })

  it('should enable submit button when URL is provided', () => {
    render(<SummaryForm onSubmit={jest.fn()} />)

    const urlInput = screen.getByPlaceholderText(/https:\/\/example.com\/article/i)
    // Need at least 10 characters (MIN_URL_LENGTH)
    const testUrl = 'https://example.com/article'
    fireEvent.change(urlInput, { target: { value: testUrl } })

    const submitButton = screen.getByRole('button', { name: /générer/i })
    expect(submitButton).not.toBeDisabled()
  })

  it('should call onSubmit with form data when submitted', async () => {
    const onSubmit = jest.fn()
    render(<SummaryForm onSubmit={onSubmit} />)

    // Fill in URL
    const urlInput = screen.getByPlaceholderText(/https:\/\/example.com\/article/i)
    const testUrl = 'https://example.com/article'
    fireEvent.change(urlInput, { target: { value: testUrl } })

    // Select style (click the second style button which is TWEET)
    const styleButtons = screen.getAllByRole('button').filter(btn => btn.getAttribute('aria-pressed') !== null)
    fireEvent.click(styleButtons[1])

    // Submit form
    const submitButton = screen.getByRole('button', { name: /générer/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        text: testUrl,
        style: 'TWEET',
        source: 'url',
      })
    })
  })

  it('should show loading state when submitting', () => {
    render(<SummaryForm onSubmit={jest.fn()} isLoading={true} />)

    const submitButton = screen.getByRole('button', { name: /générer|génération/i })
    expect(submitButton).toBeDisabled()
  })

  it('should validate minimum URL length', () => {
    render(<SummaryForm onSubmit={jest.fn()} />)

    const urlInput = screen.getByPlaceholderText(/https:\/\/example.com\/article/i)
    fireEvent.change(urlInput, { target: { value: 'short' } })

    const submitButton = screen.getByRole('button', { name: /générer/i })
    // Should be disabled for too short URL
    expect(submitButton).toBeDisabled()
  })

  it('should enable submit when PDF file is selected', () => {
    render(<SummaryForm onSubmit={jest.fn()} />)

    // Switch to PDF mode
    const pdfButton = screen.getByText(/pdf/i)
    fireEvent.click(pdfButton)

    // Create a fake file
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' })
    const fileInput = screen.getByLabelText(/fichier pdf/i) as HTMLInputElement

    fireEvent.change(fileInput, { target: { files: [file] } })

    const submitButton = screen.getByRole('button', { name: /générer/i })
    expect(submitButton).not.toBeDisabled()
  })
})
