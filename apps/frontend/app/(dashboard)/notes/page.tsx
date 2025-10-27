'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useNotes, useCreateNote, useDeleteNote } from '@/lib/hooks/useNotes'
import { NoteList } from '@/components/notes/NoteList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/provider'

// Lazy load the Markdown editor (reduces initial bundle size by ~20-30 KB)
const NoteEditor = dynamic(
  () => import('@/components/notes/NoteEditor').then(mod => ({ default: mod.NoteEditor })),
  {
    ssr: false, // Disable SSR for the editor (client-side only)
  }
)

export default function NotesPage() {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const showMyOnly = searchParams.get('my') === 'true'

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')

  const { data: notes = [], isLoading } = useNotes()
  const createNote = useCreateNote()
  const deleteNote = useDeleteNote()

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error(t('common.messages.requiredField'))
      return
    }

    try {
      await createNote.mutateAsync({
        title,
        content,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      toast.success(t('common.messages.success'))
      setTitle('')
      setContent('')
      setTags('')
    } catch {
      toast.error(t('common.messages.error'))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNote.mutateAsync(id)
      toast.success(t('notes.actions.delete'))
    } catch {
      toast.error(t('common.messages.error'))
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          {showMyOnly && (
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.actions.back')}
            </Button>
          )}
        </div>
        <h1 className="text-3xl font-bold mb-2">
          {showMyOnly ? t('notes.myNotes') : t('notes.title')}
        </h1>
        <p className="text-muted-foreground">
          {showMyOnly
            ? `${notes.length} note${notes.length > 1 ? 's' : ''}`
            : t('notes.subtitle')
          }
        </p>
      </div>

      {/* Create Note Form - Hide when in my-only mode */}
      {!showMyOnly && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>{t('notes.createNote')}</CardTitle>
            <CardDescription>
              {t('notes.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="note-title" className="text-sm font-medium mb-2 block">{t('notes.editor.titlePlaceholder')}</label>
              <Input
                id="note-title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('notes.editor.titlePlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="note-content" className="text-sm font-medium mb-2 block">{t('notes.editor.contentPlaceholder')}</label>
              <NoteEditor
                id="note-content"
                value={content}
                onChange={setContent}
                placeholder={t('notes.editor.contentPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="note-tags" className="text-sm font-medium mb-2 block">
                {t('notes.editor.tagsPlaceholder')}
              </label>
              <Input
                id="note-tags"
                name="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t('notes.editor.tagsPlaceholder')}
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={createNote.isPending}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {createNote.isPending ? t('notes.editor.saving') : t('notes.editor.saveButton')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      <div>
        {!showMyOnly && <h2 className="text-2xl font-semibold mb-4">{t('notes.myNotes')} ({notes.length})</h2>}

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('common.messages.loading')}
          </div>
        ) : (
          <NoteList
            notes={notes}
            onDelete={handleDelete}
            isDeleting={deleteNote.isPending}
          />
        )}
      </div>
    </div>
  )
}
