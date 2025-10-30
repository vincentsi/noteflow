'use client'

import { useState, useEffect } from 'react'
import { StyleSelector, type SummaryStyle } from './StyleSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Link, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/provider'

type SourceType = 'url' | 'pdf'

export interface SummaryFormData {
  text?: string
  file?: File
  style: SummaryStyle
  source: SourceType
}

export interface SummaryFormProps {
  onSubmit: (data: SummaryFormData) => void
  isLoading?: boolean
  initialUrl?: string | null
}

const MIN_URL_LENGTH = 10

export function SummaryForm({ onSubmit, isLoading = false, initialUrl }: SummaryFormProps) {
  const { t } = useI18n()
  const [source, setSource] = useState<SourceType>('url')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [style, setStyle] = useState<SummaryStyle>('SHORT')

  // Update URL when initialUrl changes
  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl)
    }
  }, [initialUrl])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const formData: SummaryFormData = {
      style,
      source,
    }

    if (source === 'url') {
      formData.text = url
    } else {
      formData.file = file || undefined
    }

    onSubmit(formData)
  }

  const isValid = source === 'url'
    ? url.trim().length >= MIN_URL_LENGTH
    : file !== null

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Source Selector */}
      <Card>
        <CardHeader>
          <CardTitle>{t('summaries.form.sourceTitle')}</CardTitle>
          <CardDescription>{t('summaries.form.sourceDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setSource('url')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                'hover:border-primary/50 hover:bg-accent/50',
                source === 'url'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background'
              )}
            >
              <Link className={cn('h-6 w-6', source === 'url' ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('font-medium', source === 'url' ? 'text-primary' : 'text-foreground')}>
                {t('summaries.form.urlLabel')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSource('pdf')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                'hover:border-primary/50 hover:bg-accent/50',
                source === 'pdf'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background'
              )}
            >
              <Upload className={cn('h-6 w-6', source === 'pdf' ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('font-medium', source === 'pdf' ? 'text-primary' : 'text-foreground')}>
                {t('summaries.form.pdfLabel')}
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Content Input */}
      <Card>
        <CardHeader>
          <CardTitle>{t('summaries.form.contentTitle')}</CardTitle>
          <CardDescription>
            {source === 'url'
              ? t('summaries.form.contentDescriptionUrl')
              : t('summaries.form.contentDescriptionPdf')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {source === 'url' ? (
            <input
              id="url-input"
              name="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('summaries.form.urlPlaceholder')}
              className="w-full h-12 px-4 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              disabled={isLoading}
              aria-label={t('summaries.form.urlAriaLabel')}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label
                  htmlFor="pdf-upload"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-background cursor-pointer hover:bg-accent transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>{t('summaries.form.choosePdfFile')}</span>
                </Label>
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="sr-only"
                  disabled={isLoading}
                  aria-label={t('summaries.form.choosePdfAriaLabel')}
                />
              </div>
              {file && (
                <p className="text-sm text-muted-foreground">
                  {t('summaries.form.fileSelected', { filename: file.name })}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Style Selector */}
      <Card>
        <CardHeader>
          <CardTitle>{t('summaries.form.styleTitle')}</CardTitle>
          <CardDescription>{t('summaries.form.styleDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <StyleSelector value={style} onChange={setStyle} />
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={!isValid || isLoading}
      >
        {isLoading ? t('summaries.form.generating') : t('summaries.form.submitButton')}
      </Button>
    </form>
  )
}
