import { AdminRoute } from '@/components/auth/admin-route'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminRoute>
      <div className="min-h-screen bg-background">
        {/* Admin Navigation */}
        <nav className="bg-background border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link href="/admin" className="font-bold text-xl text-foreground">
                  Admin Panel
                </Link>
                <div className="hidden md:flex space-x-4">
                  <Link
                    href="/admin"
                    className="text-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/admin/users"
                    className="text-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Users
                  </Link>
                  <Link
                    href="/admin/subscriptions"
                    className="text-foreground hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Subscriptions
                  </Link>
                </div>
              </div>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="container mx-auto py-8 px-4">{children}</main>
      </div>
    </AdminRoute>
  )
}
