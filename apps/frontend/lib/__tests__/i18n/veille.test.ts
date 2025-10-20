import { i18n } from '@/lib/i18n/config'

describe('Veille i18n', () => {
  it('should translate veille.title in French', () => {
    i18n.changeLanguage('fr')
    expect(i18n.t('veille.title')).toBe('Veille IA')
  })

  it('should translate veille.title in English', () => {
    i18n.changeLanguage('en')
    expect(i18n.t('veille.title')).toBe('AI Watch')
  })

  it('should translate filters', () => {
    i18n.changeLanguage('fr')
    expect(i18n.t('veille.filters.source')).toBe('Source')
  })

  it('should translate filters in English', () => {
    i18n.changeLanguage('en')
    expect(i18n.t('veille.filters.source')).toBe('Source')
  })

  it('should translate plan usage', () => {
    i18n.changeLanguage('fr')
    expect(i18n.t('veille.planUsage.title')).toBe('Utilisation du plan')
  })

  it('should translate plan usage in English', () => {
    i18n.changeLanguage('en')
    expect(i18n.t('veille.planUsage.title')).toBe('Plan Usage')
  })

  it('should return key if translation not found', () => {
    i18n.changeLanguage('fr')
    expect(i18n.t('veille.nonexistent.key')).toBe('veille.nonexistent.key')
  })
})
