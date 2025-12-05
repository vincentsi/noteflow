'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Global Error Handler for Next.js App Router
 *
 * This component catches errors that occur in nested React Server Components
 * and reports them to Sentry for monitoring.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/error
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/#react-render-errors-in-app-router
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Report error to Sentry
    Sentry.captureException(error)
  }, [error])

  const handleGoHome = () => {
    // Safe internal redirect
    window.location.href = '/'
  }

  return (
    <html lang="fr">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-destructive">Something went wrong!</CardTitle>
              <CardDescription>
                An unexpected error occurred. Our team has been notified and is working on a fix.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error.digest && (
                <div className="bg-muted p-3 rounded-md">
                  <p className="text-xs font-mono text-muted-foreground">
                    Error ID: {error.digest}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please provide this ID when contacting support.
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={reset} variant="default" className="flex-1">
                  Try again
                </Button>
                <Button
                  onClick={handleGoHome}
                  variant="outline"
                  className="flex-1"
                >
                  Go home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </body>
    </html>
  )
}
