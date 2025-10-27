'use client'

import { useI18n } from '@/lib/i18n/provider'
import { Button } from '@/components/ui/button'

/**
 * Language Switcher Component
 * Allows users to switch between French and English
 *
 * Displays current language flag and toggles on click
 */
export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n()

  const toggleLanguage = () => {
    setLanguage(language === 'fr' ? 'en' : 'fr')
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      aria-label="Change language"
      className="text-sm font-medium"
    >
      {language === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
    </Button>
  )
}
