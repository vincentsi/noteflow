'use client'

import { useAuth } from '@/providers/auth.provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Welcome, {user?.name || user?.email}</h1>
          <p className="text-muted-foreground dark:text-gray-400">
            Here&apos;s your dashboard
          </p>
        </div>
        <Button onClick={handleLogout} variant="outline">
          Logout
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>User</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium dark:text-gray-200">Email</dt>
                <dd className="text-muted-foreground dark:text-gray-400">{user?.email}</dd>
              </div>
              <div>
                <dt className="font-medium dark:text-gray-200">ID</dt>
                <dd className="text-muted-foreground dark:text-gray-400 font-mono text-xs">
                  {user?.id}
                </dd>
              </div>
              <div>
                <dt className="font-medium dark:text-gray-200">Plan</dt>
                <dd className="text-muted-foreground dark:text-gray-400 font-semibold">
                  {user?.planType || 'FREE'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
              Current plan: <span className="font-semibold dark:text-gray-200">{user?.planType || 'FREE'}</span>
            </p>
            <Button
              onClick={() => router.push('/pricing')}
              variant="outline"
              className="w-full"
            >
              {user?.planType === 'FREE' ? 'Upgrade Plan' : 'Manage Billing'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stack</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <ul className="space-y-1 text-muted-foreground dark:text-gray-400">
              <li>✅ Next.js 15 + App Router</li>
              <li>✅ Fastify Backend</li>
              <li>✅ PostgreSQL + Prisma</li>
              <li>✅ JWT Authentication</li>
              <li>✅ shadcn/ui + Tailwind</li>
              <li>✅ React Query</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
