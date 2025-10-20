import { useState } from 'react'
import type { UseFormSetError, FieldValues, Path } from 'react-hook-form'

/**
 * Reusable hook for form submission with error handling
 *
 * Eliminates repetitive try-catch blocks in form components
 *
 * @example
 * ```tsx
 * const { handleSubmit, isSubmitting } = useFormSubmit({
 *   onSubmit: async (data) => {
 *     await authApi.login(data)
 *   },
 *   onSuccess: () => {
 *     router.push('/dashboard')
 *   },
 *   setError: form.setError,
 *   defaultErrorMessage: 'Login failed. Please try again.',
 * })
 *
 * <form onSubmit={form.handleSubmit(handleSubmit)}>
 *   ...
 * </form>
 * ```
 */
export function useFormSubmit<TFormData extends FieldValues>({
  onSubmit,
  onSuccess,
  onError,
  setError,
  defaultErrorMessage = 'An error occurred. Please try again.',
}: {
  /** The async function to call with form data */
  onSubmit: (data: TFormData) => Promise<void>
  /** Optional callback after successful submission */
  onSuccess?: (data: TFormData) => void
  /** Optional callback after error (before setting form error) */
  onError?: (error: unknown, data: TFormData) => void
  /** React Hook Form setError function */
  setError: UseFormSetError<TFormData>
  /** Default error message to show if API doesn't provide one */
  defaultErrorMessage?: string
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: TFormData) => {
    setIsSubmitting(true)

    try {
      await onSubmit(data)
      onSuccess?.(data)
    } catch (error: unknown) {
      // Call user's error handler if provided
      onError?.(error, data)

      // Extract error message from API response
      const errorData = (error as { response?: { data?: { error?: string; message?: string } } })
        ?.response?.data
      const errorMessage = errorData?.error || errorData?.message || defaultErrorMessage

      // Set form error
      setError('root' as Path<TFormData>, {
        message: errorMessage,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    handleSubmit,
    isSubmitting,
  }
}
