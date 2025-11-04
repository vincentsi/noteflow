'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Eye, Edit } from 'lucide-react'

export interface NoteEditorProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function NoteEditor({ id, value, onChange, placeholder }: NoteEditorProps) {
  const [isPreview, setIsPreview] = useState(false)

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={!isPreview ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setIsPreview(false)}
          >
            <Edit className="h-4 w-4 mr-1.5" />
            Éditer
          </Button>
          <Button
            type="button"
            variant={isPreview ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setIsPreview(true)}
          >
            <Eye className="h-4 w-4 mr-1.5" />
            Aperçu
          </Button>
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          Markdown supporté
        </span>
      </div>

      {/* Editor or Preview */}
      {!isPreview ? (
        <textarea
          id={id}
          name="content"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '# Titre\n\nVotre contenu en Markdown...'}
          rows={12}
          className="flex min-h-[200px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 font-mono transition-all duration-150"
        />
      ) : (
        <div className="min-h-[200px] w-full rounded-md border border-border bg-muted px-4 py-3">
          {value ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{value}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Aucun contenu à prévisualiser
            </div>
          )}
        </div>
      )}
    </div>
  )
}
