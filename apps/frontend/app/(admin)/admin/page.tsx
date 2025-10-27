'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { adminApi } from '@/lib/api/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useI18n } from '@/lib/i18n/provider'

export default function AdminDashboardPage() {
  const { t } = useI18n()
  const [showCleanupDialog, setShowCleanupDialog] = useState(false)

  // Fetch admin stats
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => adminApi.getStats(),
  })

  // Cleanup tokens mutation
  const cleanupMutation = useMutation({
    mutationFn: () => adminApi.cleanupTokens(),
    onSuccess: () => {
      toast.success(t('admin.dashboard.messages.cleanupSuccess'))
      setShowCleanupDialog(false)
    },
    onError: () => {
      toast.error(t('admin.dashboard.messages.cleanupError'))
      setShowCleanupDialog(false)
    },
  })

  const confirmCleanup = () => {
    cleanupMutation.mutate()
  }

  if (isLoadingStats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('admin.dashboard.loadingStats')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold dark:text-white">{t('admin.dashboard.title')}</h1>
        <p className="text-muted-foreground dark:text-gray-400">
          {t('admin.subtitle')}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('admin.dashboard.stats.totalUsers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('admin.dashboard.stats.verifiedUsers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.verifiedUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('admin.dashboard.stats.verificationRate', {
                rate: stats?.totalUsers
                  ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100)
                  : 0
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('admin.dashboard.stats.unverifiedUsers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.unverifiedUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('admin.dashboard.stats.admins')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats?.byRole.find((r) => r.role === 'ADMIN')?._count || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users by Role */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.dashboard.usersByRole.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats?.byRole.map((roleStats) => (
              <div key={roleStats.role} className="flex justify-between items-center">
                <span className="font-medium dark:text-gray-200">{roleStats.role}</span>
                <span className="text-muted-foreground dark:text-gray-400">{t('admin.dashboard.usersByRole.usersCount', { count: roleStats._count })}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.dashboard.quickActions.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => setShowCleanupDialog(true)}
            variant="outline"
            disabled={cleanupMutation.isPending}
          >
            {cleanupMutation.isPending ? t('admin.dashboard.quickActions.cleaning') : t('admin.dashboard.quickActions.cleanupTokens')}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t('admin.dashboard.quickActions.cleanupDescription')}
          </p>
        </CardContent>
      </Card>

      {/* Cleanup Confirmation Dialog */}
      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.dashboard.cleanupDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.dashboard.cleanupDialog.description')}
              <br />
              <br />
              {t('admin.dashboard.cleanupDialog.warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.dashboard.cleanupDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCleanup}
              disabled={cleanupMutation.isPending}
            >
              {cleanupMutation.isPending ? t('admin.dashboard.quickActions.cleaning') : t('admin.dashboard.cleanupDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
