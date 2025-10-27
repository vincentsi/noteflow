'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useAuth } from '@/providers/auth.provider'
import { apiClient } from '@/lib/api/client'
import type { Language, I18nContextType, Translations } from './types'
import frTranslations from './fr.json'
import enTranslations from './en.json'

const translations: Record<Language, Translations> = {
  fr: frTranslations,
  en: enTranslations,
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [language, setLanguageState] = useState<Language>('fr')
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize language from localStorage or user preference
  useEffect(() => {
    // Priority: user preference from backend > localStorage > default ('fr')
    if (user?.language && (user.language === 'fr' || user.language === 'en')) {
      setLanguageState(user.language as Language)
      localStorage.setItem('language', user.language)
    } else {
      const savedLang = localStorage.getItem('language') as Language | null
      if (savedLang === 'fr' || savedLang === 'en') {
        setLanguageState(savedLang)
      }
    }
    setIsInitialized(true)
  }, [user])

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)

    // Sync with backend if user is authenticated
    if (user) {
      try {
        await apiClient.patch('/api/users/me', { language: lang })
      } catch (error) {
        console.error('Failed to sync language with backend:', error)
        // Continue with local update even if backend sync fails
      }
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
