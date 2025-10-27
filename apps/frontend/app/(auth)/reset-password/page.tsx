'use client'

import { useState, useEffect, Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import { useI18n } from '@/lib/i18n/provider'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const resetPasswordSchema = (t: (key: string) => string) => z
  .object({
    password: z
      .string()
      .min(12, t('auth.resetPassword.passwordMinLength'))
      .regex(/[A-Z]/, t('auth.resetPassword.passwordUppercase'))
      .regex(/[a-z]/, t('auth.resetPassword.passwordLowercase'))
      .regex(/[0-9]/, t('auth.resetPassword.passwordNumber'))
      .regex(/[^A-Za-z0-9]/, t('auth.resetPassword.passwordSpecial')),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: t('auth.resetPassword.passwordMismatch'),
    path: ['confirmPassword'],
  })

type ResetPasswordForm = {
  password: string
  confirmPassword: string
}

function ResetPasswordContent() {
  const { t } = useI18n()
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema(t)),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (!token) {
      setError(t('auth.resetPassword.invalidLinkMessage'))
    }
  }, [token, t])

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setError(t('auth.resetPassword.invalidLinkMessage'))
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      await authApi.resetPassword({ token, newPassword: data.password })
      setIsSuccess(true)

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error: unknown) {
      // Extract error message from API response
      const errorData = (error as { response?: { data?: { error?: string; message?: string } } })
        ?.response?.data
      const errorMessage = errorData?.error || errorData?.message || t('auth.resetPassword.errorMessage')

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (error && !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('auth.resetPassword.invalidLinkTitle')}</CardTitle>
            <CardDescription>
              {t('auth.resetPassword.invalidLinkMessage')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/forgot-password">
              <Button className="w-full">{t('auth.resetPassword.requestNewLink')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t('auth.resetPassword.successTitle')}</CardTitle>
            <CardDescription>
              {t('auth.resetPassword.successMessage')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">{t('auth.resetPassword.backToLogin')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.resetPassword.title')}</CardTitle>
          <CardDescription>
            {t('auth.resetPassword.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                  {error}
                </div>
              )}

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.resetPassword.newPasswordLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.resetPassword.confirmPasswordLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('auth.resetPassword.resetting') : t('auth.resetPassword.resetButton')}
              </Button>

              <div className="text-center text-sm">
                <Link href="/login" className="text-muted-foreground dark:text-gray-400 hover:text-primary">
                  {t('auth.resetPassword.backToLogin')}
                </Link>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

function ResetPasswordFallback() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground dark:text-gray-400">{t('common.messages.loading')}</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  )
}
