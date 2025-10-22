import { Label } from '@/components/ui/label'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { useArticleSources } from '@/lib/hooks/useArticles'
import type { GetArticlesParams } from '@/lib/api/articles'

export interface ArticleFiltersProps {
  filters: GetArticlesParams
  onChange: (filters: GetArticlesParams) => void
}

export function ArticleFilters({ filters, onChange }: ArticleFiltersProps) {
  const { t } = useTranslation()
  const { data: sources = [], isLoading } = useArticleSources()

  const handleSourceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    onChange({
      ...filters,
      source: value === '' ? undefined : value,
    })
  }

  return (
    <div className="flex flex-col gap-4 p-4 rounded-lg border bg-card">
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
    </div>
  )
}
