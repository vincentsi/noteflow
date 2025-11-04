'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type AdminUser } from '@/lib/api/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useAuth } from '@/providers/auth.provider'
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

export default function AdminUsersPage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [page, setPage] = useState(1)
  const limit = 20
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null)
  const [roleChangeUser, setRoleChangeUser] = useState<{ user: AdminUser; newRole: 'USER' | 'ADMIN' | 'MODERATOR' } | null>(null)

  // Fetch users
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => adminApi.listUsers({ page, limit, sortBy: 'createdAt', sortOrder: 'desc' }),
  })

  // Delete user mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(t('admin.users.messages.deleteSuccess'))
      setUserToDelete(null)
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(t('admin.users.messages.deleteError', { message }))
    },
  })

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'USER' | 'ADMIN' | 'MODERATOR' }) =>
      adminApi.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(t('admin.users.messages.roleUpdateSuccess'))
      setRoleChangeUser(null)
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error(t('admin.users.messages.roleUpdateError', { message }))
    },
  })

  const handleDeleteUser = (user: AdminUser) => {
    if (user.id === currentUser?.id) {
      toast.error(t('admin.users.messages.cannotDeleteSelf'))
      return
    }
    setUserToDelete(user)
  }

  const confirmDelete = () => {
    if (userToDelete) {
      deleteMutation.mutate(userToDelete.id)
    }
  }

  const handleChangeRole = (user: AdminUser, newRole: 'USER' | 'ADMIN' | 'MODERATOR') => {
    if (newRole === user.role) {
      return // No change
    }
    setRoleChangeUser({ user, newRole })
  }

  const confirmRoleChange = () => {
    if (roleChangeUser) {
      updateRoleMutation.mutate({
        userId: roleChangeUser.user.id,
        role: roleChangeUser.newRole,
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('admin.users.loadingUsers')}</p>
        </div>
      </div>
    )
  }

  const users = data?.data.items || []
  const pagination = data?.data.pagination

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('admin.users.title')}</h1>
          <p className="text-base text-muted-foreground mt-2">
            {t('admin.users.totalUsers', { count: pagination?.totalCount || 0 })}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('admin.users.allUsers')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-foreground">{t('admin.users.table.email')}</th>
                  <th className="text-left p-2 text-foreground">{t('admin.users.table.name')}</th>
                  <th className="text-left p-2 text-foreground">{t('admin.users.table.role')}</th>
                  <th className="text-left p-2 text-foreground">{t('admin.users.table.verified')}</th>
                  <th className="text-left p-2 text-foreground">{t('admin.users.table.created')}</th>
                  <th className="text-right p-2 text-foreground">{t('admin.users.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted transition-colors">
                    <td className="p-2">
                      <div className="font-medium text-foreground">{user.email}</div>
                      <div className="text-xs text-muted-foreground font-mono">{user.id}</div>
                    </td>
                    <td className="p-2 text-foreground">{user.name || '-'}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded-sm text-xs font-medium border ${
                          user.role === 'ADMIN'
                            ? 'border-primary bg-primary/10 text-primary'
                            : user.role === 'MODERATOR'
                              ? 'border-foreground/30 bg-foreground/10 text-foreground'
                              : 'border-border bg-background text-foreground'
                        }`}
                      >
                        {t(`admin.users.roles.${user.role}`)}
                      </span>
                    </td>
                    <td className="p-2">
                      {user.emailVerified ? (
                        <span className="text-foreground">✓</span>
                      ) : (
                        <span className="text-primary">✗</span>
                      )}
                    </td>
                    <td className="p-2 text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Role Dropdown */}
                        <select
                          className="text-sm border border-border rounded-md px-2 py-1 bg-background text-foreground"
                          value={user.role}
                          onChange={(e) =>
                            handleChangeRole(
                              user,
                              e.target.value as 'USER' | 'ADMIN' | 'MODERATOR'
                            )
                          }
                          disabled={updateRoleMutation.isPending}
                        >
                          <option value="USER">{t('admin.users.roles.USER')}</option>
                          <option value="MODERATOR">{t('admin.users.roles.MODERATOR')}</option>
                          <option value="ADMIN">{t('admin.users.roles.ADMIN')}</option>
                        </select>

                        {/* Delete Button */}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteUser(user)}
                          disabled={deleteMutation.isPending || user.id === currentUser?.id}
                        >
                          {deleteMutation.isPending ? t('admin.users.actions.deleting') : t('admin.users.actions.delete')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                {t('admin.users.pagination.page', { current: pagination.page, total: pagination.totalPages })}
              </div>
              <div className="space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPreviousPage}
                >
                  {t('admin.users.pagination.previous')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasNextPage}
                >
                  {t('admin.users.pagination.next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.users.deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.users.deleteDialog.description', { email: userToDelete?.email || '' })}
              <br />
              <br />
              {t('admin.users.deleteDialog.warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.users.deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? t('admin.users.actions.deleting') : t('admin.users.deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Change Confirmation Dialog */}
      <AlertDialog open={!!roleChangeUser} onOpenChange={() => setRoleChangeUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.users.roleChangeDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.users.roleChangeDialog.description', { email: roleChangeUser?.user.email || '' })}
              <br />
              <br />
              <span className="font-semibold">{t('admin.users.roleChangeDialog.from')}</span> {roleChangeUser?.user.role}
              <br />
              <span className="font-semibold">{t('admin.users.roleChangeDialog.to')}</span> {roleChangeUser?.newRole}
              <br />
              <br />
              {t('admin.users.roleChangeDialog.warning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.users.roleChangeDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRoleChange}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending ? t('admin.users.roleChangeDialog.updating') : t('admin.users.roleChangeDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
