'use client'

import type { Note } from '@/lib/api/notes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export interface NoteListProps {
  notes: Note[]
  onSelect?: (note: Note) => void
  onDelete?: (id: string) => void
  isDeleting?: boolean
}

export function NoteList({ notes, onSelect, onDelete, isDeleting }: NoteListProps) {
  if (notes.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucune note pour le moment. Créez votre première note ci-dessus.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {notes.map((note) => (
        <Card key={note.id} className="hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div
                className="flex-1 cursor-pointer"
                onClick={() => onSelect?.(note)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelect?.(note)
                  }
                }}
              >
                <CardTitle className="hover:text-primary transition-colors">
                  {note.title}
                </CardTitle>
                <CardDescription className="mt-1">
                  {new Date(note.updatedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </CardDescription>
              </div>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(note.id)}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none mb-3">
              <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded line-clamp-3">
                {note.content}
              </pre>
            </div>
            {note.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
