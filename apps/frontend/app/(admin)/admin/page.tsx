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

export default function AdminDashboardPage() {
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
      toast.success('Token cleanup completed successfully!')
      setShowCleanupDialog(false)
    },
    onError: () => {
      toast.error('Failed to cleanup tokens')
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading stats...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold dark:text-white">Admin Dashboard</h1>
        <p className="text-muted-foreground dark:text-gray-400">
          Manage users, subscriptions, and system settings
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Verified Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.verifiedUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalUsers
                ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100)
                : 0}
              % verification rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unverified Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.unverifiedUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Admins
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
          <CardTitle>Users by Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats?.byRole.map((roleStats) => (
              <div key={roleStats.role} className="flex justify-between items-center">
                <span className="font-medium dark:text-gray-200">{roleStats.role}</span>
                <span className="text-muted-foreground dark:text-gray-400">{roleStats._count} users</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => setShowCleanupDialog(true)}
            variant="outline"
            disabled={cleanupMutation.isPending}
          >
            {cleanupMutation.isPending ? 'Cleaning...' : '🧹 Cleanup Expired Tokens'}
          </Button>
          <p className="text-sm text-muted-foreground">
            Remove expired tokens from the database to keep it clean.
          </p>
        </CardContent>
      </Card>

      {/* Cleanup Confirmation Dialog */}
      <AlertDialog open={showCleanupDialog} onOpenChange={setShowCleanupDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cleanup Expired Tokens</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cleanup expired tokens?
              <br />
              <br />
              This will remove all expired refresh tokens, verification tokens, password reset tokens, and CSRF tokens from the database. This operation cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCleanup}
              disabled={cleanupMutation.isPending}
            >
              {cleanupMutation.isPending ? 'Cleaning...' : 'Confirm Cleanup'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
