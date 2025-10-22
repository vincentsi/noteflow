'use client'

import { useState } from 'react'
import { useNotes, useCreateNote, useDeleteNote } from '@/lib/hooks/useNotes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

export default function NotesPage() {
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
    } catch (error) {
      toast.error('Erreur lors de la création de la note')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteNote.mutateAsync(id)
      toast.success('Note supprimée')
    } catch (error) {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">PowerNote</h1>
        <p className="text-muted-foreground">
          Prenez des notes en Markdown avec tags
        </p>
      </div>

      {/* Create Note Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Nouvelle Note</CardTitle>
          <CardDescription>
            Créez une note en Markdown avec des tags pour l&apos;organiser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Titre</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la note"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Contenu (Markdown)</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="# Titre&#10;&#10;Votre contenu en Markdown..."
              rows={8}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Tags (séparés par des virgules)
            </label>
            <Input
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

      {/* Notes List */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Mes Notes ({notes.length})</h2>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Chargement des notes...
          </div>
        ) : notes.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Aucune note pour le moment. Créez votre première note ci-dessus.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {notes.map((note) => (
              <Card key={note.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{note.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {new Date(note.updatedAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(note.id)}
                      disabled={deleteNote.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none mb-3">
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded">
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
        )}
      </div>
    </div>
  )
}
