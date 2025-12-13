'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Note } from '@/lib/api/notes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Trash2, Pin, Sparkles } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'

export interface NoteListProps {
  notes: Note[]
  onSelect?: (note: Note) => void
  onDelete?: (id: string) => void
  onTogglePin?: (id: string) => void
  onSummarize?: (note: Note) => void
  isDeleting?: boolean
  isTogglingPin?: boolean
}

export function NoteList({ notes, onSelect, onDelete, onTogglePin, onSummarize, isDeleting, isTogglingPin }: NoteListProps) {
  const { t } = useI18n()
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null)

  const handleDeleteConfirm = () => {
    if (noteToDelete && onDelete) {
      onDelete(noteToDelete)
      setNoteToDelete(null)
    }
  }

  if (notes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Aucune note pour le moment. Créez votre première note ci-dessus.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {notes.map((note) => (
        <Card key={note.id} className="hover:border-primary hover:-translate-y-0.5 transition-all duration-150">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
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
                <CardTitle className="text-base font-semibold hover:text-primary transition-colors">
                  {note.title}
                </CardTitle>
                <CardDescription className="mt-1 text-sm">
                  {new Date(note.updatedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {onSummarize && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onSummarize(note)}
                    title={t('notes.summarize.title')}
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
                  </Button>
                )}
                {onTogglePin && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onTogglePin(note.id)}
                    disabled={isTogglingPin}
                  >
                    <Pin className={`h-4 w-4 ${note.pinned ? 'fill-primary text-primary' : ''}`} />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setNoteToDelete(note.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none mb-3 line-clamp-3 overflow-hidden text-sm">
              <ReactMarkdown>
                {note.content}
              </ReactMarkdown>
            </div>
            {note.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium border border-border bg-background"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('notes.messages.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('notes.messages.deleteConfirmMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
