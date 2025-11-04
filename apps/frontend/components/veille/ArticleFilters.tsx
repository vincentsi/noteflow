import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/lib/i18n/provider'
import { useArticleSources } from '@/lib/hooks/useArticles'
import type { GetArticlesParams } from '@/lib/api/articles'

export interface ArticleFiltersProps {
  filters: GetArticlesParams
  onChange: (filters: GetArticlesParams) => void
}

export function ArticleFilters({ filters, onChange }: ArticleFiltersProps) {
  const { t } = useI18n()
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
    <div className="flex flex-col gap-4 p-4 rounded-md border border-border bg-card">
      {/* Search Input */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="search-filter" className="text-sm font-medium">{t('veille.filters.search')}</Label>
        <Input
          id="search-filter"
          type="text"
          placeholder={t('veille.filters.searchPlaceholder')}
          value={filters.search || ''}
          onChange={handleSearchChange}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source Filter */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="source-filter" className="text-sm font-medium">{t('veille.filters.source')}</Label>
          <select
            id="source-filter"
            value={filters.source || ''}
            onChange={handleSourceChange}
            disabled={isLoading}
            className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-4 py-2 text-sm transition-all duration-150 focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
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
          <Label htmlFor="date-filter" className="text-sm font-medium">{t('veille.filters.dateRange')}</Label>
          <select
            id="date-filter"
            value={filters.dateRange || 'all'}
            onChange={handleDateRangeChange}
            className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-background px-4 py-2 text-sm transition-all duration-150 focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20"
          >
            <option value="all">{t('veille.filters.allDates')}</option>
            <option value="24h">{t('veille.filters.last24h')}</option>
            <option value="7d">{t('veille.filters.last7days')}</option>
            <option value="30d">{t('veille.filters.last30days')}</option>
          </select>
        </div>
      </div>
    </div>
  )
}
