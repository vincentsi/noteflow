import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  notesApi,
  type CreateNoteData,
  type UpdateNoteData,
  type GetNotesParams,
  type Note,
} from '@/lib/api/notes'

/**
 * Query keys for notes cache
 */
export const notesKeys = {
  all: ['notes'] as const,
  lists: () => [...notesKeys.all, 'list'] as const,
  list: (filters?: GetNotesParams) => [...notesKeys.lists(), filters] as const,
  searches: () => [...notesKeys.all, 'search'] as const,
  search: (query: string) => [...notesKeys.searches(), query] as const,
}

/**
 * Hook to fetch all user notes
 */
export function useNotes(params?: GetNotesParams) {
  return useQuery<Note[], Error>({
    queryKey: notesKeys.list(params),
    queryFn: () => notesApi.getNotes(params),
  })
}

/**
 * Hook to create a new note
 */
export function useCreateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateNoteData) => notesApi.createNote(data),
    onSuccess: () => {
      // Invalidate and refetch notes
      queryClient.invalidateQueries({ queryKey: notesKeys.all })
    },
  })
}

/**
 * Hook to update a note
 */
export function useUpdateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateNoteData }) =>
      notesApi.updateNote(id, data),
    onSuccess: () => {
      // Invalidate and refetch notes
      queryClient.invalidateQueries({ queryKey: notesKeys.all })
    },
  })
}

/**
 * Hook to toggle pinned status of a note
 */
export function useTogglePinned() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notesApi.togglePinned(id),
    onSuccess: () => {
      // Invalidate and refetch notes
      queryClient.invalidateQueries({ queryKey: notesKeys.all })
    },
  })
}

/**
 * Hook to delete a note
 */
export function useDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notesApi.deleteNote(id),
    onSuccess: () => {
      // Invalidate and refetch notes
      queryClient.invalidateQueries({ queryKey: notesKeys.all })
    },
  })
}

/**
 * Hook to search notes
 */
export function useSearchNotes(query: string) {
  return useQuery<Note[], Error>({
    queryKey: notesKeys.search(query),
    queryFn: () => notesApi.searchNotes(query),
    enabled: query.length > 0,
  })
}

/**
 * Hook to create a note from a summary
 */
export function useCreateNoteFromSummary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (summaryId: string) => notesApi.createNoteFromSummary(summaryId),
    onSuccess: () => {
      // Invalidate and refetch notes
      queryClient.invalidateQueries({ queryKey: notesKeys.all })
    },
  })
}
