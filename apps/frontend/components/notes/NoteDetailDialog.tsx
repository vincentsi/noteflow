'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, X, Edit, Save, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/provider'
import { useUpdateNote } from '@/lib/hooks/useNotes'
import type { Note } from '@/lib/api/notes'

// Lazy load the Markdown editor
const NoteEditor = dynamic(
  () => import('@/components/notes/NoteEditor').then(mod => ({ default: mod.NoteEditor })),
  {
    ssr: false,
  }
)

export interface NoteDetailDialogProps {
  note: Note | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NoteDetailDialog({ note, open, onOpenChange }: NoteDetailDialogProps) {
  const { t } = useI18n()
  const updateNote = useUpdateNote()

  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')

  // Reset form when note changes
  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setTags(note.tags.join(', '))
      setIsEditing(false)
    }
  }, [note])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S to save (only in edit mode)
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && isEditing) {
        e.preventDefault()
        handleSave()
      }
      // Escape to cancel edit mode
      if (e.key === 'Escape' && isEditing) {
        e.preventDefault()
        handleCancel()
      }
    }

    if (open) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, isEditing])

  if (!note) return null

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(note.content)
      toast.success(t('common.messages.copied'))
    } catch {
      toast.error(t('common.messages.error'))
    }
  }

  const handleExport = () => {
    try {
      // Create markdown content with metadata
      const markdownContent = `# ${note.title}\n\n**Tags:** ${note.tags.map(t => `#${t}`).join(', ')}\n**Date:** ${new Date(note.updatedAt).toLocaleDateString('fr-FR')}\n\n---\n\n${note.content}`

      const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Note exportée avec succès')
    } catch {
      toast.error(t('common.messages.error'))
    }
  }

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error(t('common.messages.requiredField'))
      return
    }

    try {
      await updateNote.mutateAsync({
        id: note.id,
        data: {
          title,
          content,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        },
      })
      toast.success(t('common.messages.success'))
      setIsEditing(false)
    } catch {
      toast.error(t('common.messages.error'))
    }
  }

  const handleCancel = () => {
    setTitle(note.title)
    setContent(note.content)
    setTags(note.tags.join(', '))
    setIsEditing(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          {isEditing ? (
            <>
              <DialogTitle className="sr-only">{t('common.actions.edit')}</DialogTitle>
              <DialogDescription className="sr-only">
                {t('notes.editor.contentPlaceholder')}
              </DialogDescription>
              <div className="space-y-2">
                <label htmlFor="edit-note-title" className="sr-only">{t('notes.editor.titlePlaceholder')}</label>
                <Input
                  id="edit-note-title"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('notes.editor.titlePlaceholder')}
                  className="text-xl font-bold"
                />
              </div>
            </>
          ) : (
            <>
              <DialogTitle className="text-xl font-bold pr-8">{note.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {new Date(note.updatedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </DialogDescription>
            </>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-note-content" className="text-sm font-medium mb-2 block">{t('notes.editor.contentPlaceholder')}</label>
                <NoteEditor
                  id="edit-note-content"
                  value={content}
                  onChange={setContent}
                  placeholder={t('notes.editor.contentPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="edit-note-tags" className="text-sm font-medium mb-2 block">{t('notes.editor.tagsPlaceholder')}</label>
                <Input
                  id="edit-note-tags"
                  name="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder={t('notes.editor.tagsPlaceholder')}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md font-mono leading-relaxed">
                  {note.content}
                </pre>
              </div>

              {note.tags.length > 0 && (
                <div className="flex gap-2 flex-wrap mt-4">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-medium border border-border bg-background"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 justify-between border-t pt-4">
          <div className="flex gap-2">
            {!isEditing && (
              <>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('summaries.buttons.copyText')}
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exporter
                </Button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  {t('common.actions.cancel')}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={updateNote.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateNote.isPending ? t('notes.editor.saving') : t('notes.editor.saveButton')}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('common.actions.edit')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4 mr-2" />
                  {t('common.actions.close')}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
