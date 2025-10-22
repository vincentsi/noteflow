'use client'

import { useState } from 'react'
import { StyleSelector, type SummaryStyle } from './StyleSelector'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Link, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

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
}

const MIN_URL_LENGTH = 10

export function SummaryForm({ onSubmit, isLoading = false }: SummaryFormProps) {
  const [source, setSource] = useState<SourceType>('url')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [style, setStyle] = useState<SummaryStyle>('SHORT')

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
          <CardTitle>Source</CardTitle>
          <CardDescription>Choisissez le type de contenu à résumer</CardDescription>
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
                URL
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
                PDF
              </span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Content Input */}
      <Card>
        <CardHeader>
          <CardTitle>Contenu</CardTitle>
          <CardDescription>
            {source === 'url'
              ? 'Entrez l\'URL de l\'article à résumer'
              : 'Uploadez votre fichier PDF'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {source === 'url' ? (
            <div className="space-y-2">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full h-12 px-4 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                Entrez l'URL d'un article web à résumer
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Label
                  htmlFor="pdf-upload"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-background cursor-pointer hover:bg-accent transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>Choisir un fichier PDF</span>
                </Label>
                <input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="sr-only"
                  disabled={isLoading}
                  aria-label="Choisir un fichier PDF"
                />
              </div>
              {file && (
                <p className="text-sm text-muted-foreground">
                  Fichier sélectionné: {file.name}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Style Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Style de résumé</CardTitle>
          <CardDescription>Choisissez le format de votre résumé</CardDescription>
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
        {isLoading ? 'Génération en cours...' : 'Générer le résumé'}
      </Button>
    </form>
  )
}
