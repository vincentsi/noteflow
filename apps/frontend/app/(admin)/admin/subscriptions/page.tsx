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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading subscriptions...</p>
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
          <h1 className="text-3xl font-bold dark:text-white">Subscriptions Management</h1>
          <p className="text-muted-foreground dark:text-gray-400">
            {pagination?.totalCount || 0} total subscriptions
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left p-2 dark:text-gray-300">User</th>
                  <th className="text-left p-2 dark:text-gray-300">Plan</th>
                  <th className="text-left p-2 dark:text-gray-300">Status</th>
                  <th className="text-left p-2 dark:text-gray-300">Period</th>
                  <th className="text-left p-2 dark:text-gray-300">Stripe ID</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center p-8 text-gray-500 dark:text-gray-400">
                      No subscriptions found
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="p-2">
                        <div className="font-medium dark:text-gray-200">{sub.user.email}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{sub.user.name || '-'}</div>
                      </td>
                      <td className="p-2">
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {sub.planType}
                        </span>
                      </td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            sub.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : sub.status === 'CANCELED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {sub.status}
                          {sub.cancelAtPeriodEnd && ' (Canceling)'}
                        </span>
                      </td>
                      <td className="p-2 text-sm">
                        <div className="dark:text-gray-300">
                          Start: {new Date(sub.currentPeriodStart).toLocaleDateString()}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          End: {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
                          {sub.stripeSubscriptionId}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
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
            <div className="flex justify-between items-center mt-4 pt-4 border-t dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">
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
