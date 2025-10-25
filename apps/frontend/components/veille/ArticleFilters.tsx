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

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    onChange({
      ...filters,
      search: value === '' ? undefined : value,
    })
  }

  const handleDateRangeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as '24h' | '7d' | '30d' | 'all' | ''
    onChange({
      ...filters,
      dateRange: value === '' ? undefined : value as '24h' | '7d' | '30d' | 'all',
    })
  }

  return (
    <div className="flex flex-col gap-4 p-6 rounded-xl border-2 bg-gradient-to-br from-card to-card shadow-lg">
      {/* Search Input */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="search-filter" className="font-semibold">🔍 Rechercher</Label>
        <input
          id="search-filter"
          type="text"
          placeholder="Rechercher dans les titres et contenus..."
          value={filters.search || ''}
          onChange={handleSearchChange}
          className="flex h-11 w-full rounded-lg border-2 border-input bg-background px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Filter */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="source-filter" className="font-semibold">📰 {t('veille.filters.source')}</Label>
          <select
            id="source-filter"
            value={filters.source || ''}
            onChange={handleSourceChange}
            disabled={isLoading}
            className="flex h-11 w-full items-center justify-between rounded-lg border-2 border-input bg-background px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all"
          >
            <option value="">{t('veille.filters.allSources')}</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="date-filter" className="font-semibold">📅 Période</Label>
          <select
            id="date-filter"
            value={filters.dateRange || 'all'}
            onChange={handleDateRangeChange}
            className="flex h-11 w-full items-center justify-between rounded-lg border-2 border-input bg-background px-4 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
          >
            <option value="all">Toutes les dates</option>
            <option value="24h">Dernières 24h</option>
            <option value="7d">7 derniers jours</option>
            <option value="30d">30 derniers jours</option>
          </select>
        </div>
      </div>
    </div>
  )
}
