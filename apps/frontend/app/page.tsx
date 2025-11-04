'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/providers/auth.provider'
import { useI18n } from '@/lib/i18n/provider'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Newspaper, Sparkles, FileText, ArrowRight, Globe } from 'lucide-react'

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuth()
  const { t, language, setLanguage } = useI18n()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight text-foreground">
            NoteFlow
          </Link>
          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Change language"
            >
              <Globe className="h-4 w-4" />
              <span className="uppercase">{language}</span>
            </button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">{t('home.nav.login')}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">{t('home.nav.getStarted')}</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-5xl w-full space-y-16">
          {/* Hero Content */}
          <div className="text-center space-y-6 max-w-3xl mx-auto">
            <div className="inline-block px-3 py-1 bg-muted border border-border rounded-full text-xs font-medium text-foreground mb-4">
              {t('home.hero.badge')}
            </div>
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight text-foreground">
              {t('home.hero.title1')}
              <br />
              <span className="text-primary">{t('home.hero.title2')}</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t('home.hero.subtitle')}
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <Button asChild size="lg" className="text-base px-8 h-12">
                <Link href="/register">
                  {t('home.hero.ctaPrimary')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base px-8 h-12">
                <Link href="/login">{t('home.hero.ctaSecondary')}</Link>
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 pt-8">
            <div className="group border border-border bg-card rounded-lg p-6 hover:border-foreground/30 transition-all duration-200">
              <div className="flex items-center justify-center h-12 w-12 rounded-sm bg-background border border-border mb-4">
                <Newspaper className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{t('home.features.veille.title')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('home.features.veille.description')}
              </p>
            </div>

            <div className="group border border-border bg-card rounded-lg p-6 hover:border-primary/50 transition-all duration-200">
              <div className="flex items-center justify-center h-12 w-12 rounded-sm bg-primary/10 border border-primary/20 mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{t('home.features.powerpost.title')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('home.features.powerpost.description')}
              </p>
            </div>

            <div className="group border border-border bg-card rounded-lg p-6 hover:border-foreground/30 transition-all duration-200">
              <div className="flex items-center justify-center h-12 w-12 rounded-sm bg-background border border-border mb-4">
                <FileText className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">{t('home.features.powernote.title')}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('home.features.powernote.description')}
              </p>
            </div>
          </div>

          {/* Pricing Teaser */}
          <div className="text-center space-y-4 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground">
              {t('home.pricing.text')}
            </p>
            <Button asChild variant="ghost" size="sm">
              <Link href="/pricing">
                {t('home.pricing.link')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-sm text-muted-foreground">
            <p>{t('home.footer.text')}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
