import { apiClient } from './client'

export type Note = {
  id: string
  userId: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type CreateNoteData = {
  title: string
  content: string
  tags: string[]
}

export type UpdateNoteData = {
  title?: string
  content?: string
  tags?: string[]
}

export type GetNotesParams = {
  tags?: string
}

export type NotesResponse = {
  success: boolean
  data: {
    notes: Note[]
  }
}

export type NoteResponse = {
  success: boolean
  data: Note
}

/**
 * Notes API client
 * Manages markdown notes with tags
 */
export const notesApi = {
  /**
   * Get all user notes
   */
  getNotes: async (params?: GetNotesParams): Promise<Note[]> => {
    const response = await apiClient.get<NotesResponse>('/api/notes', {
      params,
    })
    return response.data.data.notes
  },

  /**
   * Create a new note
   */
  createNote: async (data: CreateNoteData): Promise<Note> => {
    const response = await apiClient.post<NoteResponse>('/api/notes', data)
    return response.data.data
  },

  /**
   * Update a note
   */
  updateNote: async (
    id: string,
    data: UpdateNoteData
  ): Promise<Note> => {
    const response = await apiClient.patch<NoteResponse>(
      `/api/notes/${id}`,
      data
    )
    return response.data.data
  },

  /**
   * Delete a note
   */
  deleteNote: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/notes/${id}`)
  },

  /**
   * Search notes
   */
  searchNotes: async (query: string): Promise<Note[]> => {
    const response = await apiClient.get<NotesResponse>('/api/notes/search', {
      params: { q: query },
    })
    return response.data.data.notes
  },
}
