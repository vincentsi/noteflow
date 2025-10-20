import { cn } from '../utils'

describe('Utils - cn (className merger)', () => {
  it('merges multiple class names', () => {
    const result = cn('class1', 'class2', 'class3')
    expect(result).toBe('class1 class2 class3')
  })

  it('handles conditional classes', () => {
    const isActive = true
    const result = cn('base', isActive && 'active')
    expect(result).toBe('base active')
  })

  it('filters out falsy values', () => {
    const result = cn('class1', false, null, undefined, 'class2')
    expect(result).toBe('class1 class2')
  })

  it('handles Tailwind class conflicts', () => {
    // cn uses clsx + tailwind-merge
    // tailwind-merge resolves conflicts (e.g., last padding wins)
    const result = cn('p-4', 'p-8')
    expect(result).toBe('p-8')
  })

  it('merges arrays of classes', () => {
    const result = cn(['class1', 'class2'], 'class3')
    expect(result).toContain('class1')
    expect(result).toContain('class2')
    expect(result).toContain('class3')
  })

  it('handles empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('handles objects with conditional classes', () => {
    const result = cn({
      'base-class': true,
      'conditional-class': false,
      'another-class': true,
    })
    expect(result).toContain('base-class')
    expect(result).not.toContain('conditional-class')
    expect(result).toContain('another-class')
  })
})
