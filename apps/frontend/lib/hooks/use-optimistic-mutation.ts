import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query'

/**
 * Hook for mutations with optimistic updates
 *
 * Provides optimistic UI updates before server response for better UX.
 * Automatically rolls back on error.
 *
 * @example
 * ```tsx
 * const updateProfile = useOptimisticMutation({
 *   mutationFn: (data) => api.updateProfile(data),
 *   queryKey: ['profile'],
 *   onOptimisticUpdate: (oldData, newData) => ({ ...oldData, ...newData }),
 * })
 * ```
 */
export function useOptimisticMutation<
  TData = unknown,
  TVariables = unknown,
  TContext = unknown
>({
  mutationFn,
  queryKey,
  onOptimisticUpdate,
  ...options
}: UseMutationOptions<TData, Error, TVariables, TContext> & {
  queryKey: string[]
  onOptimisticUpdate?: (oldData: TData | undefined, variables: TVariables) => TData
}) {
  const queryClient = useQueryClient()

  return useMutation<TData, Error, TVariables, TContext>({
    mutationFn,
    ...options,

    // Optimistic update: update cache immediately before server response
    onMutate: async (variables) => {
      // Cancel outgoing refetches (so they don't overwrite optimistic update)
      await queryClient.cancelQueries({ queryKey })

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData>(queryKey)

      // Optimistically update cache
      if (onOptimisticUpdate && previousData) {
        const optimisticData = onOptimisticUpdate(previousData, variables)
        queryClient.setQueryData(queryKey, optimisticData)
      }

      // Return context with previous data for rollback
      return { previousData } as TContext
    },

    // On error, rollback to previous data
    onError: (error, variables, context, mutation) => {
      const ctx = context as { previousData?: TData }
      if (ctx?.previousData) {
        queryClient.setQueryData(queryKey, ctx.previousData)
      }

      // Call user's onError if provided
      options.onError?.(error, variables, context, mutation)
    },

    // Always refetch after success or error to ensure sync with server
    onSettled: (data, error, variables, context, mutation) => {
      queryClient.invalidateQueries({ queryKey })
      options.onSettled?.(data, error, variables, context, mutation)
    },
  })
}
