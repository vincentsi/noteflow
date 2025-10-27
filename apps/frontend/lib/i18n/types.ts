import type frTranslations from './fr.json'

export type Language = 'fr' | 'en'

export type TranslationKey = string

// Type-safe translations based on French structure
export type Translations = typeof frTranslations

// Helper type for nested translation paths
export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never
    }[keyof T]
  : never

// Type-safe translation function
export interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}
