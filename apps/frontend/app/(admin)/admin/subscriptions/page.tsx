'use client'

import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/api/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

export default function AdminSubscriptionsPage() {
  const [page, setPage] = useState(1)
  const limit = 20

  // Fetch subscriptions
  const { data, isLoading } = useQuery({
    queryKey: ['admin-subscriptions', page],
    queryFn: () =>
      adminApi.listSubscriptions({ page, limit, sortBy: 'createdAt', sortOrder: 'desc' }),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading subscriptions...</p>
        </div>
      </div>
    )
  }

  const subscriptions = data?.data.items || []
  const pagination = data?.data.pagination

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Subscriptions Management</h1>
          <p className="text-base text-muted-foreground mt-2">
            {pagination?.totalCount || 0} total subscriptions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 text-foreground">User</th>
                  <th className="text-left p-2 text-foreground">Plan</th>
                  <th className="text-left p-2 text-foreground">Status</th>
                  <th className="text-left p-2 text-foreground">Period</th>
                  <th className="text-left p-2 text-foreground">Stripe ID</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-muted-foreground">
                      No subscriptions found
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-border hover:bg-muted transition-colors">
                      <td className="p-2">
                        <div className="font-medium text-foreground">{sub.user.email}</div>
                        <div className="text-xs text-muted-foreground">{sub.user.name || '-'}</div>
                      </td>
                      <td className="p-2">
                        <span className="px-2 py-1 rounded-sm text-xs font-medium border border-foreground/30 bg-foreground/10 text-foreground">
                          {sub.planType}
                        </span>
                      </td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 rounded-sm text-xs font-medium border ${
                            sub.status === 'ACTIVE'
                              ? 'border-foreground bg-foreground/10 text-foreground'
                              : sub.status === 'CANCELED'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-foreground/30 bg-foreground/5 text-foreground/70'
                          }`}
                        >
                          {sub.status}
                          {sub.cancelAtPeriodEnd && ' (Canceling)'}
                        </span>
                      </td>
                      <td className="p-2 text-sm">
                        <div className="text-foreground">
                          Start: {new Date(sub.currentPeriodStart).toLocaleDateString()}
                        </div>
                        <div className="text-muted-foreground">
                          End: {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="text-xs font-mono text-muted-foreground">
                          {sub.stripeSubscriptionId}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(sub.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <div className="space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPreviousPage}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!pagination.hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
