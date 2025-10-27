'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useNotes, useCreateNote, useDeleteNote } from '@/lib/hooks/useNotes'
import { NoteList } from '@/components/notes/NoteList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// Lazy load the Markdown editor (reduces initial bundle size by ~20-30 KB)
const NoteEditor = dynamic(
  () => import('@/components/notes/NoteEditor').then(mod => ({ default: mod.NoteEditor })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8 border rounded-lg bg-muted/50">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement de l'éditeur...</span>
      </div>
    ),
    ssr: false, // Disable SSR for the editor (client-side only)
  }
)

export default function NotesPage() {
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
      toast.error('Le titre et le contenu sont requis')
      return
    }

    try {
      await createNote.mutateAsync({
        title,
        content,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      })
      toast.success('Note créée avec succès')
      setTitle('')
      setContent('')
      setTags('')
    } catch {
      toast.error('Erreur lors de la création de la note')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNote.mutateAsync(id)
      toast.success('Note supprimée')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          {showMyOnly && (
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
          )}
        </div>
        <h1 className="text-3xl font-bold mb-2">
          {showMyOnly ? 'Mes notes' : 'PowerNote'}
        </h1>
        <p className="text-muted-foreground">
          {showMyOnly
            ? `${notes.length} note${notes.length > 1 ? 's' : ''}`
            : 'Prenez des notes en Markdown avec tags'
          }
        </p>
      </div>

      {/* Create Note Form - Hide when in my-only mode */}
      {!showMyOnly && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Nouvelle Note</CardTitle>
            <CardDescription>
              Créez une note en Markdown avec des tags pour l&apos;organiser
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label htmlFor="note-title" className="text-sm font-medium mb-2 block">Titre</label>
              <Input
                id="note-title"
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre de la note"
              />
            </div>

            <div>
              <label htmlFor="note-content" className="text-sm font-medium mb-2 block">Contenu (Markdown)</label>
              <NoteEditor
                id="note-content"
                value={content}
                onChange={setContent}
                placeholder="# Titre&#10;&#10;Votre contenu en Markdown..."
              />
            </div>

            <div>
              <label htmlFor="note-tags" className="text-sm font-medium mb-2 block">
                Tags (séparés par des virgules)
              </label>
              <Input
                id="note-tags"
                name="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="travail, personnel, important"
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={createNote.isPending}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {createNote.isPending ? 'Création...' : 'Créer la note'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      <div>
        {!showMyOnly && <h2 className="text-2xl font-semibold mb-4">Mes Notes ({notes.length})</h2>}

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Chargement des notes...
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
