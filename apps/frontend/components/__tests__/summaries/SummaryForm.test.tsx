import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SummaryForm } from '../../summaries/SummaryForm'

describe('SummaryForm', () => {
  it('should render source selector with Text and PDF options', () => {
    render(<SummaryForm onSubmit={jest.fn()} />)

    // Should show both source options as buttons
    const texteElements = screen.getAllByText(/texte/i)
    const pdfElements = screen.getAllByText(/pdf/i)

    expect(texteElements.length).toBeGreaterThan(0)
    expect(pdfElements.length).toBeGreaterThan(0)
  })

  it('should show textarea when text source is selected', () => {
    render(<SummaryForm onSubmit={jest.fn()} />)

    // Text should be selected by default
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('placeholder')
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

    // Should show all 6 styles
    expect(screen.getByText('SHORT')).toBeInTheDocument()
    expect(screen.getByText('TWEET')).toBeInTheDocument()
    expect(screen.getByText('THREAD')).toBeInTheDocument()
  })

  it('should disable submit button when no text provided', () => {
    render(<SummaryForm onSubmit={jest.fn()} />)

    const submitButton = screen.getByRole('button', { name: /générer/i })
    expect(submitButton).toBeDisabled()
  })

  it('should enable submit button when text is provided', () => {
    render(<SummaryForm onSubmit={jest.fn()} />)

    const textarea = screen.getByRole('textbox')
    // Need at least 50 characters
    const longText = 'This is a sufficiently long text to summarize that meets the minimum character requirement'
    fireEvent.change(textarea, { target: { value: longText } })

    const submitButton = screen.getByRole('button', { name: /générer/i })
    expect(submitButton).not.toBeDisabled()
  })

  it('should call onSubmit with form data when submitted', async () => {
    const onSubmit = jest.fn()
    render(<SummaryForm onSubmit={onSubmit} />)

    // Fill in text (need at least 50 characters)
    const textarea = screen.getByRole('textbox')
    const longText = 'This is a sufficiently long text that I want to summarize using the AI tool'
    fireEvent.change(textarea, { target: { value: longText } })

    // Select style
    const tweetStyle = screen.getByText('TWEET')
    fireEvent.click(tweetStyle)

    // Submit form
    const submitButton = screen.getByRole('button', { name: /générer/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        text: longText,
        style: 'TWEET',
        source: 'text',
      })
    })
  })

  it('should show loading state when submitting', () => {
    render(<SummaryForm onSubmit={jest.fn()} isLoading={true} />)

    const submitButton = screen.getByRole('button', { name: /générer|génération/i })
    expect(submitButton).toBeDisabled()
  })

  it('should validate minimum text length', () => {
    render(<SummaryForm onSubmit={jest.fn()} />)

    const textarea = screen.getByRole('textbox')
    fireEvent.change(textarea, { target: { value: 'short' } })

    const submitButton = screen.getByRole('button', { name: /générer/i })
    // Should be disabled for too short text
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
