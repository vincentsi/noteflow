'use client'

import { useAuth } from '@/providers/auth.provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard'
import { useUserStats } from '@/lib/hooks/useUserStats'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { data: stats, isLoading } = useUserStats()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Tableau de bord</h1>
          <p className="text-muted-foreground dark:text-gray-400">
            Bienvenue {user?.name || user?.email}
          </p>
        </div>
        <Button onClick={handleLogout} variant="outline">
          Déconnexion
        </Button>
      </div>

      {/* Plan Usage Card */}
      {stats && !isLoading && (
        <PlanUsageCard stats={stats} plan={user?.planType} />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations utilisateur</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium dark:text-gray-200">Email</dt>
                <dd className="text-muted-foreground dark:text-gray-400">{user?.email}</dd>
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
            <CardTitle>Abonnement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
              Plan actuel : <span className="font-semibold dark:text-gray-200">{user?.planType || 'FREE'}</span>
            </p>
            <Button
              onClick={() => router.push('/pricing')}
              variant="outline"
              className="w-full"
            >
              {user?.planType === 'FREE' ? 'Passer à un plan supérieur' : 'Gérer mon abonnement'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
