import { render, screen } from '@testing-library/react'
import { OfflineIndicator } from '../offline-indicator'

// Mock useOnlineStatus hook
jest.mock('@/lib/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(),
}))

import { useOnlineStatus } from '@/lib/hooks/use-online-status'

const mockUseOnlineStatus = useOnlineStatus as jest.MockedFunction<
  typeof useOnlineStatus
>

describe('OfflineIndicator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders nothing when online', () => {
    mockUseOnlineStatus.mockReturnValue(true)

    const { container } = render(<OfflineIndicator />)
    expect(container.firstChild).toBeNull()
  })

  it('renders offline message when offline', () => {
    mockUseOnlineStatus.mockReturnValue(false)

    render(<OfflineIndicator />)

    expect(
      screen.getByText(/you are currently offline/i)
    ).toBeInTheDocument()
  })

  it('displays WiFi off icon when offline', () => {
    mockUseOnlineStatus.mockReturnValue(false)

    const { container } = render(<OfflineIndicator />)

    // Check if the WifiOff icon SVG is present
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('has correct styling classes', () => {
    mockUseOnlineStatus.mockReturnValue(false)

    const { container } = render(<OfflineIndicator />)

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('fixed', 'bottom-0', 'bg-destructive')
  })

  it('updates visibility when online status changes', () => {
    mockUseOnlineStatus.mockReturnValue(true)

    const { rerender } = render(<OfflineIndicator />)

    expect(screen.queryByText(/you are currently offline/i)).not.toBeInTheDocument()

    // Simulate going offline
    mockUseOnlineStatus.mockReturnValue(false)
    rerender(<OfflineIndicator />)

    expect(screen.getByText(/you are currently offline/i)).toBeInTheDocument()
  })
})
