import { render, screen } from '@testing-library/react'
import { Label } from '../ui/label'

describe('Label Component', () => {
  it('renders label with text', () => {
    render(<Label>Username</Label>)

    expect(screen.getByText('Username')).toBeInTheDocument()
  })

  it('associates with input via htmlFor', () => {
    render(
      <div>
        <Label htmlFor="email-input">Email</Label>
        <input id="email-input" type="email" />
      </div>
    )

    const label = screen.getByText('Email')
    expect(label).toHaveAttribute('for', 'email-input')
  })

  it('applies custom className', () => {
    render(<Label className="custom-label">Custom Label</Label>)

    const label = screen.getByText('Custom Label')
    expect(label).toHaveClass('custom-label')
  })

  it('renders children correctly', () => {
    render(
      <Label>
        <span>Required</span> Field
      </Label>
    )

    expect(screen.getByText('Required')).toBeInTheDocument()
    expect(screen.getByText(/Field/)).toBeInTheDocument()
  })
})
