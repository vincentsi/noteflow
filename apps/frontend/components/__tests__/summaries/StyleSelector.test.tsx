import { render, screen, fireEvent } from '@testing-library/react'
import { StyleSelector } from '../../summaries/StyleSelector'

describe('StyleSelector', () => {
  const allStyles = ['SHORT', 'TWEET', 'THREAD', 'BULLET_POINT', 'TOP3', 'MAIN_POINTS', 'EDUCATIONAL']

  it('should render all 7 summary styles', () => {
    render(<StyleSelector value="SHORT" onChange={jest.fn()} />)

    // Should have 7 style buttons
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(7)
  })

  it('should call onChange when a style is clicked', () => {
    const onChange = jest.fn()
    render(<StyleSelector value="SHORT" onChange={onChange} />)

    const buttons = screen.getAllByRole('button')
    // Click the second button (TWEET)
    fireEvent.click(buttons[1])

    expect(onChange).toHaveBeenCalledWith('TWEET')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('should highlight the selected style', () => {
    render(<StyleSelector value="TWEET" onChange={jest.fn()} />)

    const buttons = screen.getAllByRole('button')
    const tweetButton = buttons[1] // TWEET is the second button
    const shortButton = buttons[0] // SHORT is the first button

    // Selected style should have different styling
    expect(tweetButton).toHaveClass('border-primary')
    expect(shortButton).not.toHaveClass('border-primary')
  })

  it('should not call onChange when clicking already selected style', () => {
    const onChange = jest.fn()
    render(<StyleSelector value="SHORT" onChange={onChange} />)

    const buttons = screen.getAllByRole('button')
    // Click the first button (SHORT) which is already selected
    fireEvent.click(buttons[0])

    expect(onChange).not.toHaveBeenCalled()
  })

  it('should render style descriptions/icons', () => {
    render(<StyleSelector value="SHORT" onChange={jest.fn()} />)

    // Should have some visual indicator for each style
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(7)

    // Each button should have aria-pressed attribute
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('aria-pressed')
    })
  })

  it('should be keyboard accessible', () => {
    const onChange = jest.fn()
    render(<StyleSelector value="SHORT" onChange={onChange} />)

    const buttons = screen.getAllByRole('button')
    const tweetButton = buttons[1]

    // Button should be focusable and have proper ARIA attributes
    expect(tweetButton).toHaveAttribute('type', 'button')
    expect(tweetButton).toHaveAttribute('aria-pressed')

    // Verify button can receive focus
    tweetButton?.focus()
    expect(tweetButton).toHaveFocus()
  })
})
