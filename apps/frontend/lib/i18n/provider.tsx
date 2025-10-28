'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiClient } from '@/lib/api/client'
import type { Language, I18nContextType, Translations } from './types'
import frTranslations from './fr.json'
import enTranslations from './en.json'
import { logError } from '@/lib/utils/logger'

const translations: Record<Language, Translations> = {
  fr: frTranslations,
  en: enTranslations,
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr')
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize language from localStorage only
  // User language sync happens in AuthProvider
  useEffect(() => {
    const savedLang = localStorage.getItem('language') as Language | null
    if (savedLang === 'fr' || savedLang === 'en') {
      setLanguageState(savedLang)
    }
    setIsInitialized(true)

    // Listen for storage changes (from AuthProvider or other tabs)
    const handleStorageChange = () => {
      const updatedLang = localStorage.getItem('language') as Language | null
      if (updatedLang === 'fr' || updatedLang === 'en') {
        setLanguageState(updatedLang)
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)

    // Attempt to sync with backend (will succeed if user is authenticated via httpOnly cookie)
    // The apiClient automatically includes auth cookies with the request
    try {
      await apiClient.patch('/api/users/me', { language: lang })
    } catch (error) {
      // Silent failure is acceptable:
      // - User might not be authenticated (401) - expected behavior
      // - Network error - local preference still saved
      // Backend sync will happen on next successful auth
      logError(error, 'Failed to sync language with backend')
    }
  }

  // Translation function with nested key support and parameter interpolation
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.')
    let value: unknown = translations[language]

    // Navigate through nested object
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = (value as Record<string, unknown>)[k]
      } else {
        // Return key if translation not found (helps debug missing translations)
        return key
      }
    }

    // Interpolate parameters if provided
    if (typeof value === 'string' && params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return paramKey in params ? String(params[paramKey]) : match
      })
    }

    return typeof value === 'string' ? value : key
  }

  // Don't render children until language is loaded from localStorage
  // This prevents flash of wrong language
  if (!isInitialized) {
    return null
  }

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  )
}

/**
 * Hook to access i18n context
 * Provides language, setLanguage, and translation function
 *
 * @example
 * const { t, language, setLanguage } = useI18n()
 * console.log(t('common.actions.save')) // "Enregistrer" or "Save"
 * console.log(t('dashboard.welcome', { name: 'John' })) // "Bienvenue, John"
 */
export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
