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
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <main className="container mx-auto py-8 px-4 max-w-7xl">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}
