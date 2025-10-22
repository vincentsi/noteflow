'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth.provider'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Newspaper, Sparkles, FileText } from 'lucide-react'

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-4xl text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              NoteFlow
            </h1>
            <p className="text-2xl text-muted-foreground">
              Votre assistant IA pour la veille technologique et la prise de notes
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <Button asChild size="lg" className="text-lg px-8">
              <Link href="/register">Commencer gratuitement</Link>
            </Button>

            <Button asChild variant="outline" size="lg" className="text-lg px-8">
              <Link href="/login">Se connecter</Link>
            </Button>
          </div>

          {/* Features Grid */}
          <div className="pt-16 grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Newspaper className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Veille IA</h3>
              <p className="text-muted-foreground">
                Aggrégez et filtrez les articles des meilleurs flux RSS tech et IA. Sauvegardez vos favoris.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                  <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">PowerPost</h3>
              <p className="text-muted-foreground">
                Résumez vos textes et PDFs avec l'IA. 6 styles disponibles : court, tweet, thread, bullet points...
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">PowerNote</h3>
              <p className="text-muted-foreground">
                Prenez des notes en Markdown avec tags. Publiez vos meilleures notes en posts publics.
              </p>
            </div>
          </div>

          {/* Pricing Teaser */}
          <div className="pt-12">
            <p className="text-sm text-muted-foreground mb-4">
              Forfait gratuit disponible • Plans à partir de 6€/mois
            </p>
            <Button asChild variant="link">
              <Link href="/pricing">Voir les tarifs →</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>NoteFlow - Propulsé par l'IA pour les développeurs</p>
        </div>
      </footer>
    </div>
  )
}
