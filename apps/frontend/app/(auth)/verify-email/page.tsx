'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api/client'
import { useI18n } from '@/lib/i18n/provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function VerifyEmailContent() {
  const { t } = useI18n()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error')
        setErrorMessage(t('auth.verifyEmail.errorMessage'))
        return
      }

      try {
        await apiClient.get(`/api/verification/verify-email?token=${token}`)
        setStatus('success')

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } catch (error: unknown) {
        setStatus('error')
        const errorData = (error as { response?: { data?: { error?: string; message?: string } } })
          ?.response?.data
        setErrorMessage(errorData?.error || errorData?.message || t('auth.verifyEmail.errorMessage'))
      }
    }

    verifyEmail()
  }, [token, router, t])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">{t('auth.verifyEmail.title')}</CardTitle>
            <CardDescription className="text-sm">{t('auth.verifyEmail.verifying')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-foreground">{t('auth.verifyEmail.successTitle')}</CardTitle>
            <CardDescription className="text-sm">
              {t('auth.verifyEmail.successMessage')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">{t('auth.verifyEmail.goToLogin')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">{t('auth.verifyEmail.errorTitle')}</CardTitle>
          <CardDescription className="text-sm">{errorMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Link href="/login" className="flex-1">
              <Button variant="outline" className="w-full">
                {t('auth.verifyEmail.goToLogin')}
              </Button>
            </Link>
            <Link href="/forgot-password" className="flex-1">
              <Button className="w-full">{t('auth.verifyEmail.requestNewLink')}</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function VerifyEmailFallback() {
  const { t } = useI18n()
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">{t('common.messages.loading')}</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  )
}
