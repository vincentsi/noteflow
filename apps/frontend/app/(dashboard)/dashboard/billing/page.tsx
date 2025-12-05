'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth.provider'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'

export default function BillingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { t } = useI18n()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    // Si paiement réussi, rafraîchir les données utilisateur
    if (success === 'true') {
      setIsRefreshing(true)
      // Attendre quelques secondes pour laisser le webhook Stripe traiter
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['me'] })
        setIsRefreshing(false)
      }, 3000)
    }
  }, [success, queryClient])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold dark:text-white">
          {t('billing.title')}
        </h1>
        <p className="text-muted-foreground dark:text-gray-400">
          {t('billing.subtitle')}
        </p>
      </div>

      {/* Success Message */}
      {success === 'true' && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              {t('billing.success.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-600 dark:text-green-300 mb-2">
              {t('billing.success.message')}
            </p>
            {sessionId && (
              <p className="text-xs text-muted-foreground dark:text-gray-400">
                Session ID: {sessionId}
              </p>
            )}
            {isRefreshing && (
              <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('billing.success.refreshing')}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Canceled Message */}
      {canceled === 'true' && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <XCircle className="h-5 w-5" />
              {t('billing.canceled.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-600 dark:text-orange-300">
              {t('billing.canceled.message')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle>{t('billing.currentPlan.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium dark:text-gray-200">
                {t('billing.currentPlan.plan')}
              </p>
              <p className="text-2xl font-bold dark:text-white">
                {user?.planType}
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => router.push('/pricing')} variant="default">
                {user?.planType === 'FREE'
                  ? t('billing.actions.upgrade')
                  : t('billing.actions.change')}
              </Button>
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
              >
                {t('billing.actions.backToDashboard')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
