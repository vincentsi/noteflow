import frTranslations from './fr.json'
import enTranslations from './en.json'

export type Language = 'fr' | 'en'

export type Translations = typeof frTranslations

const translations: Record<Language, Translations> = {
  fr: frTranslations,
  en: enTranslations,
}

// Simple i18n implementation without external dependencies
class I18n {
  private currentLanguage: Language = 'en'

  changeLanguage(lang: Language) {
    this.currentLanguage = lang
  }

  getLanguage(): Language {
    return this.currentLanguage
  }

  t(key: string): string {
    const keys = key.split('.')
    let value: unknown = translations[this.currentLanguage]

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k]
      } else {
        return key // Return key if translation not found
      }
    }

    return typeof value === 'string' ? value : key
  }
}

export const i18n = new I18n()

// Helper function for getting nested translation values
export function t(key: string): string {
  return i18n.t(key)
}
