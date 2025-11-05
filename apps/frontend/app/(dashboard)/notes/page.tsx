'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAuth } from '@/providers/auth.provider'
import { useNotes, useCreateNote, useDeleteNote, useTogglePinned, useSearchNotes } from '@/lib/hooks/useNotes'
import { NoteList } from '@/components/notes/NoteList'
import { NoteDetailDialog } from '@/components/notes/NoteDetailDialog'
import { SummarizeDialog } from '@/components/notes/SummarizeDialog'
import { AudioUpload } from '@/components/transcriptions/AudioUpload'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthRequiredDialog } from '@/components/ui/confirm-dialog'
import { Plus, ArrowLeft, Search, Eye, Code, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/provider'
import type { GetNotesParams, Note } from '@/lib/api/notes'

// Lazy load the Markdown editor (reduces initial bundle size by ~20-30 KB)
const NoteEditor = dynamic(
  () => import('@/components/notes/NoteEditor').then(mod => ({ default: mod.NoteEditor })),
  {
    ssr: false, // Disable SSR for the editor (client-side only)
  }
)

export default function NotesPage() {
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const showMyOnly = searchParams.get('my') === 'true'

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [noteToSummarize, setNoteToSummarize] = useState<Note | null>(null)
  const [showSummarizeDialog, setShowSummarizeDialog] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

  // New state for features
  const [searchQuery, setSearchQuery] = useState('')
  const [splitView, setSplitView] = useState(false)
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'title'>('updatedAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const params: GetNotesParams = { sortBy, sortOrder }
  const { data: notes = [], isLoading } = useNotes(params)
  const { data: searchResults = [], isLoading: isSearching } = useSearchNotes(searchQuery)
  const createNote = useCreateNote()
  const deleteNote = useDeleteNote()
  const togglePinned = useTogglePinned()

  const displayedNotes = searchQuery ? searchResults : notes

  const handleCreate = async () => {
    if (!isAuthenticated) {
      setShowAuthDialog(true)
      return
    }

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

  const handleTogglePin = async (id: string) => {
    if (!isAuthenticated) {
      setShowAuthDialog(true)
      return
    }

    try {
      await togglePinned.mutateAsync(id)
    } catch {
      toast.error(t('common.messages.error'))
    }
  }

  const handleDelete = async (id: string) => {
    if (!isAuthenticated) {
      setShowAuthDialog(true)
      return
    }

    try {
      await deleteNote.mutateAsync(id)
      toast.success(t('notes.actions.delete'))
    } catch {
      toast.error(t('common.messages.error'))
    }
  }

  const handleSummarize = (note: Note) => {
    if (!isAuthenticated) {
      setShowAuthDialog(true)
      return
    }

    setNoteToSummarize(note)
    setShowSummarizeDialog(true)
  }

  const handleNoteSelect = (note: Note) => {
    setSelectedNote(note)
    setShowDetailDialog(true)
  }

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  return (
    <div className="space-y-8">
      <div>
        {showMyOnly && (
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.actions.back')}
          </Button>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {showMyOnly ? t('notes.myNotes') : t('notes.title')}
        </h1>
        <p className="text-base text-muted-foreground mt-2">
          {showMyOnly
            ? `${displayedNotes.length} note${displayedNotes.length > 1 ? 's' : ''}`
            : t('notes.subtitle')
          }
        </p>
      </div>

      {/* Search and Controls Bar */}
      {!showMyOnly && (
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('notes.search.placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              className="border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'updatedAt' | 'createdAt' | 'title')}
            >
              <option value="updatedAt">{t('notes.sort.updatedAt')}</option>
              <option value="createdAt">{t('notes.sort.createdAt')}</option>
              <option value="title">{t('notes.sort.title')}</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSort}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSplitView(!splitView)}
            >
              {splitView ? <Code className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Audio Upload - Hide when in my-only mode */}
      {!showMyOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t('transcriptions.uploadAudio')}</CardTitle>
            <CardDescription className="text-sm">
              {t('transcriptions.uploadDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AudioUpload />
          </CardContent>
        </Card>
      )}

      {/* Create Note Form - Hide when in my-only mode */}
      {!showMyOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">{t('notes.createNote')}</CardTitle>
            <CardDescription className="text-sm">
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
              {splitView ? (
                <div className="grid grid-cols-2 gap-4">
                  <NoteEditor
                    id="note-content"
                    value={content}
                    onChange={setContent}
                    placeholder={t('notes.editor.contentPlaceholder')}
                  />
                  <div className="border border-border rounded-md p-4 bg-background min-h-[200px]">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {content ? (
                        <pre className="whitespace-pre-wrap text-sm">{content}</pre>
                      ) : (
                        <p className="text-muted-foreground text-sm">{t('notes.editor.previewEmpty')}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <NoteEditor
                  id="note-content"
                  value={content}
                  onChange={setContent}
                  placeholder={t('notes.editor.contentPlaceholder')}
                />
              )}
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
        {!showMyOnly && <h2 className="text-lg font-semibold text-foreground mb-4">{t('notes.myNotes')} ({displayedNotes.length})</h2>}

        {(isLoading || isSearching) ? (
          <div className="text-center py-12 text-muted-foreground">
            {t('common.messages.loading')}
          </div>
        ) : (
          <NoteList
            notes={displayedNotes}
            onSelect={handleNoteSelect}
            onDelete={handleDelete}
            onTogglePin={handleTogglePin}
            onSummarize={handleSummarize}
            isDeleting={deleteNote.isPending}
            isTogglingPin={togglePinned.isPending}
          />
        )}
      </div>

      {/* Note Detail Dialog */}
      <NoteDetailDialog
        note={selectedNote}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
      />

      {/* Summarize Dialog */}
      <SummarizeDialog
        note={noteToSummarize}
        open={showSummarizeDialog}
        onOpenChange={setShowSummarizeDialog}
      />

      {/* Auth Required Dialog */}
      <AuthRequiredDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>
  )
}
