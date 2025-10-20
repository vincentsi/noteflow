import { Label } from '@/components/ui/label'
import type { GetSavedArticlesParams } from '@/lib/api/articles'

export interface ArticleFiltersProps {
  filters: GetSavedArticlesParams
  onChange: (filters: GetSavedArticlesParams) => void
}

// Common RSS sources in tech/dev/AI space
const SOURCES = [
  'TechCrunch',
  'Hacker News',
  'The Verge',
  'Ars Technica',
  'MIT Technology Review',
  'Wired',
  'VentureBeat',
]

export function ArticleFilters({ filters, onChange }: ArticleFiltersProps) {
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
        <Label htmlFor="source-filter">Source</Label>
        <select
          id="source-filter"
          value={filters.source || ''}
          onChange={handleSourceChange}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="">All sources</option>
          {SOURCES.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
