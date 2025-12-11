'use client'

import { useState, useEffect } from 'react'
import { StyleSelector, type SummaryStyle } from './StyleSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Link, Upload, FileText, Eye, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/provider'
import { summariesApi } from '@/lib/api/summaries'
import { toast } from 'sonner'

type SourceType = 'url' | 'pdf' | 'text'

export interface SummaryFormData {
  text?: string
  file?: File
  style: SummaryStyle
  source: SourceType
  language?: 'fr' | 'en'
  templateId?: string
}

export interface SummaryFormProps {
  onSubmit: (data: SummaryFormData) => void
  isLoading?: boolean
  initialUrl?: string | null
}

const MIN_URL_LENGTH = 10

export function SummaryForm({ onSubmit, isLoading = false, initialUrl }: SummaryFormProps) {
  const { t, language } = useI18n()
  const [source, setSource] = useState<SourceType>('text')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [style, setStyle] = useState<SummaryStyle>('SHORT')
  const [templateId, setTemplateId] = useState<string | null>(null)

  // Preview state
  const [showPreview, setShowPreview] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [preview, setPreview] = useState<{
    title: string
    content: string
    wordCount: number
    charCount: number
  } | null>(null)

  // Update URL when initialUrl changes
  useEffect(() => {
    if (initialUrl) {
      setUrl(initialUrl)
      setSource('url')
    }
  }, [initialUrl])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile)
    }
  }

  const handlePreviewURL = async () => {
    if (!url || url.trim().length < MIN_URL_LENGTH) {
      toast.error(t('summaries.form.preview.invalidUrl'))
      return
    }

    setIsLoadingPreview(true)
    try {
      const response = await summariesApi.previewURL(url)
      setPreview(response.data)
      setShowPreview(true)
      toast.success(t('summaries.form.preview.success'))
    } catch (error) {
      toast.error(t('summaries.form.preview.error'))
      console.error('Preview error:', error)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const closePreview = () => {
    setShowPreview(false)
    setPreview(null)
  }

  const handleStyleOrTemplateChange = (styleOrTemplateId: SummaryStyle | string) => {
    // Check if it's a template ID (UUID format)
    const isTemplateId = styleOrTemplateId.length > 10 && styleOrTemplateId.includes('-')

    if (isTemplateId) {
      setTemplateId(styleOrTemplateId)
      setStyle('SHORT') // Set a default style when template is selected
    } else {
      setTemplateId(null)
      setStyle(styleOrTemplateId as SummaryStyle)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const formData: SummaryFormData = {
      style,
      source,
      language: language as 'fr' | 'en',
      templateId: templateId || undefined,
    }

    if (source === 'url') {
      formData.text = url
    } else if (source === 'text') {
      formData.text = text
    } else {
      formData.file = file || undefined
    }

    onSubmit(formData)
  }

  const isValid =
    source === 'url' ? url.trim().length >= MIN_URL_LENGTH :
    source === 'text' ? text.trim().length >= 10 :
    file !== null

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Source Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{t('summaries.form.sourceTitle')}</CardTitle>
          <CardDescription className="text-sm">{t('summaries.form.sourceDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setSource('text')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-md border transition-all duration-150',
                'hover:border-primary hover:-translate-y-0.5',
                source === 'text'
                  ? 'border-primary bg-background'
                  : 'border-border bg-background'
              )}
            >
              <FileText className={cn('h-5 w-5', source === 'text' ? 'text-primary' : 'text-foreground')} />
              <span className={cn('font-medium text-sm', source === 'text' ? 'text-foreground' : 'text-foreground')}>
                {t('summaries.form.textLabel')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSource('url')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-md border transition-all duration-150',
                'hover:border-primary hover:-translate-y-0.5',
                source === 'url'
                  ? 'border-primary bg-background'
                  : 'border-border bg-background'
              )}
            >
              <Link className={cn('h-5 w-5', source === 'url' ? 'text-primary' : 'text-foreground')} />
              <span className={cn('font-medium text-sm', source === 'url' ? 'text-foreground' : 'text-foreground')}>
                {t('summaries.form.urlLabel')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSource('pdf')}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-md border transition-all duration-150',
                'hover:border-primary hover:-translate-y-0.5',
                source === 'pdf'
                  ? 'border-primary bg-background'
                  : 'border-border bg-background'
              )}
            >
              <Upload className={cn('h-5 w-5', source === 'pdf' ? 'text-primary' : 'text-foreground')} />
              <span className={cn('font-medium text-sm', source === 'pdf' ? 'text-foreground' : 'text-foreground')}>
                {t('summaries.form.pdfLabel')}
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Content Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{t('summaries.form.contentTitle')}</CardTitle>
          <CardDescription className="text-sm">
            {source === 'text'
              ? t('summaries.form.contentDescriptionText')
              : source === 'url'
                ? t('summaries.form.contentDescriptionUrl')
                : t('summaries.form.contentDescriptionPdf')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {source === 'text' ? (
            <Textarea
              id="text-input"
              name="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('summaries.form.textPlaceholder')}
              disabled={isLoading}
              aria-label={t('summaries.form.textAriaLabel')}
              rows={10}
              maxLength={50000}
              className="resize-none font-mono text-sm"
            />
          ) : source === 'url' ? (
            <>
              <div className="flex gap-2">
                <Input
                  id="url-input"
                  name="url"
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value)
                    setShowPreview(false)
                    setPreview(null)
                  }}
                  placeholder={t('summaries.form.urlPlaceholder')}
                  disabled={isLoading}
                  aria-label={t('summaries.form.urlAriaLabel')}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviewURL}
                  disabled={isLoading || isLoadingPreview || url.trim().length < MIN_URL_LENGTH}
                >
                  {isLoadingPreview ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {showPreview && preview && (
                <div className="mt-4 p-4 border rounded-md bg-muted/50 relative">
                  <button
                    type="button"
                    onClick={closePreview}
                    className="absolute top-2 right-2 p-1 hover:bg-background rounded-sm"
                    aria-label="Close preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">{preview.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {preview.wordCount} {t('summaries.form.preview.words')} • {preview.charCount} {t('summaries.form.preview.chars')}
                    </p>
                    <div className="max-h-[200px] overflow-y-auto">
                      <p className="text-sm text-foreground/80 whitespace-pre-wrap">{preview.content}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Label
                  htmlFor="pdf-upload"
                  className="flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-background cursor-pointer hover:border-primary transition-all duration-150"
                >
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">{t('summaries.form.choosePdfFile')}</span>
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
          {source === 'text' && (
            <p className="text-xs text-muted-foreground mt-2">
              {text.length} / 50,000 {t('summaries.form.characters')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Style Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{t('summaries.form.styleTitle')}</CardTitle>
          <CardDescription className="text-sm">{t('summaries.form.styleDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <StyleSelector
            value={templateId || style}
            onChange={handleStyleOrTemplateChange}
            selectedTemplateId={templateId}
          />
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
