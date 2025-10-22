import { Label } from '@/components/ui/label'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { useArticleSources } from '@/lib/hooks/useArticles'
import type { GetArticlesParams } from '@/lib/api/articles'

export interface ArticleFiltersProps {
  filters: GetArticlesParams
  onChange: (filters: GetArticlesParams) => void
}

// Programming language options based on tags in DB
const PROGRAMMING_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'react', label: 'React' },
  { value: 'nodejs', label: 'Node.js' },
  { value: 'css', label: 'CSS' },
  { value: 'ai', label: 'AI/ML' },
  { value: 'docker', label: 'Docker' },
  { value: 'aws', label: 'AWS' },
] as const

export function ArticleFilters({ filters, onChange }: ArticleFiltersProps) {
  const { t } = useTranslation()
  const { data: sources = [], isLoading } = useArticleSources()

  const handleSourceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    onChange({
      source: value === '' ? undefined : value,
      // Reset language filter when source changes
      tags: undefined,
    })
  }

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    onChange({
      ...filters,
      tags: value === '' ? undefined : value,
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4 rounded-lg border bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Filter */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="source-filter">{t('veille.filters.source')}</Label>
          <select
            id="source-filter"
            value={filters.source || ''}
            onChange={handleSourceChange}
            disabled={isLoading}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">{t('veille.filters.allSources')}</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>

        {/* Language Filter */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="language-filter">Langage / Technologie</Label>
          <select
            id="language-filter"
            value={filters.tags || ''}
            onChange={handleLanguageChange}
            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Tous les langages</option>
            {PROGRAMMING_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
