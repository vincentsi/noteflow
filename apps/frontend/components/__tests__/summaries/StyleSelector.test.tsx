import { render, screen, fireEvent } from '@testing-library/react'
import { StyleSelector } from '../../summaries/StyleSelector'

describe('StyleSelector', () => {
  const allStyles = ['SHORT', 'TWEET', 'THREAD', 'BULLET_POINT', 'TOP3', 'MAIN_POINTS']

  it('should render all 6 summary styles', () => {
    render(<StyleSelector value="SHORT" onChange={jest.fn()} />)

    allStyles.forEach((style) => {
      expect(screen.getByText(style)).toBeInTheDocument()
    })
  })

  it('should call onChange when a style is clicked', () => {
    const onChange = jest.fn()
    render(<StyleSelector value="SHORT" onChange={onChange} />)

    fireEvent.click(screen.getByText('TWEET'))

    expect(onChange).toHaveBeenCalledWith('TWEET')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('should highlight the selected style', () => {
    render(<StyleSelector value="TWEET" onChange={jest.fn()} />)

    const tweetButton = screen.getByText('TWEET').closest('button')
    const shortButton = screen.getByText('SHORT').closest('button')

    // Selected style should have different styling
    expect(tweetButton).toHaveClass('border-primary')
    expect(shortButton).not.toHaveClass('border-primary')
  })

  it('should not call onChange when clicking already selected style', () => {
    const onChange = jest.fn()
    render(<StyleSelector value="SHORT" onChange={onChange} />)

    fireEvent.click(screen.getByText('SHORT'))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('should render style descriptions/icons', () => {
    render(<StyleSelector value="SHORT" onChange={jest.fn()} />)

    // Should have some visual indicator for each style
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(6)
  })

  it('should be keyboard accessible', () => {
    const onChange = jest.fn()
    render(<StyleSelector value="SHORT" onChange={onChange} />)

    const tweetButton = screen.getByText('TWEET').closest('button')

    // Button should be focusable and have proper ARIA attributes
    expect(tweetButton).toHaveAttribute('type', 'button')
    expect(tweetButton).toHaveAttribute('aria-pressed')

    // Verify button can receive focus
    tweetButton?.focus()
    expect(tweetButton).toHaveFocus()
  })
})
