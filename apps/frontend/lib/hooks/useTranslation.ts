import { useCallback } from 'react'
import { i18n } from '@/lib/i18n/config'

/**
 * Simple translation hook
 * Returns a function to translate keys
 */
export function useTranslation() {
  const t = useCallback((key: string) => {
    return i18n.t(key)
  }, [])

  return { t, i18n }
}
