import { ProtectedRoute } from '@/components/auth/protected-route'
import { DashboardNav } from '@/components/layouts/dashboard-nav'

export const dynamic = 'force-dynamic'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
        <DashboardNav />
        <main className="container mx-auto py-8 px-4">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}
