// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
import frTranslations from './lib/i18n/fr.json'

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001'

// Mock i18n globally for all tests
jest.mock('./lib/i18n/provider', () => ({
  useI18n: jest.fn(() => ({
    t: (key, params) => {
      // Navigate through nested translation object
      const keys = key.split('.')
      let value = frTranslations

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k]
        } else {
          return key // Return key if translation not found
        }
      }

      // If params are provided, do interpolation
      if (typeof value === 'string' && params) {
        return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
          return paramKey in params ? String(params[paramKey]) : match
        })
      }

      return typeof value === 'string' ? value : key
    },
    language: 'fr',
    setLanguage: jest.fn(),
  })),
  I18nProvider: ({ children }) => children,
}))
