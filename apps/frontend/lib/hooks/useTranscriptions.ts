import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transcriptionsApi, type Transcription, type TranscriptionUsage } from '@/lib/api/transcriptions'

/**
 * Query keys for transcriptions cache
 */
export const transcriptionsKeys = {
  all: ['transcriptions'] as const,
  lists: () => [...transcriptionsKeys.all, 'list'] as const,
  list: () => [...transcriptionsKeys.lists()] as const,
  detail: (id: string) => [...transcriptionsKeys.all, 'detail', id] as const,
  usage: () => [...transcriptionsKeys.all, 'usage'] as const,
}

/**
 * Hook to fetch all user transcriptions
 */
export function useTranscriptions() {
  return useQuery<Transcription[], Error>({
    queryKey: transcriptionsKeys.list(),
    queryFn: () => transcriptionsApi.getTranscriptions(),
  })
}

/**
 * Hook to fetch transcription usage
 */
export function useTranscriptionUsage() {
  return useQuery<TranscriptionUsage, Error>({
    queryKey: transcriptionsKeys.usage(),
    queryFn: () => transcriptionsApi.getUsage(),
  })
}

/**
 * Hook to fetch a single transcription
 */
export function useTranscription(id: string) {
  return useQuery<Transcription, Error>({
    queryKey: transcriptionsKeys.detail(id),
    queryFn: () => transcriptionsApi.getTranscription(id),
    enabled: !!id,
  })
}

/**
 * Hook to upload audio file for transcription
 */
export function useUploadAudio() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (file: File) => transcriptionsApi.uploadAudio(file),
    onSuccess: () => {
      // Invalidate and refetch transcriptions
      queryClient.invalidateQueries({ queryKey: transcriptionsKeys.all })
    },
  })
}

/**
 * Hook to delete a transcription
 */
export function useDeleteTranscription() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => transcriptionsApi.deleteTranscription(id),
    onSuccess: () => {
      // Invalidate and refetch transcriptions
      queryClient.invalidateQueries({ queryKey: transcriptionsKeys.all })
    },
  })
}
