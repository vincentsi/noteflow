'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Eye, Edit } from 'lucide-react'

export interface NoteEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function NoteEditor({ value, onChange, placeholder }: NoteEditorProps) {
  const [isPreview, setIsPreview] = useState(false)

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={!isPreview ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setIsPreview(false)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Éditer
          </Button>
          <Button
            type="button"
            variant={isPreview ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setIsPreview(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Aperçu
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          Markdown supporté
        </span>
      </div>

      {/* Editor or Preview */}
      {!isPreview ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || '# Titre\n\nVotre contenu en Markdown...'}
          rows={12}
          className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
        />
      ) : (
        <div className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2">
          {value ? (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{value}</ReactMarkdown>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">
              Aucun contenu à prévisualiser
            </div>
          )}
        </div>
      )}
    </div>
  )
}
