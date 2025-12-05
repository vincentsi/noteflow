'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, MessageSquare, Lightbulb, AlertCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'

export default function ContactPage() {
  const { t } = useI18n()

  const contactReasons = [
    {
      icon: AlertCircle,
      title: t('contact.reasons.bugs.title'),
      description: t('contact.reasons.bugs.description'),
      color: 'text-red-500'
    },
    {
      icon: Lightbulb,
      title: t('contact.reasons.suggestions.title'),
      description: t('contact.reasons.suggestions.description'),
      color: 'text-yellow-500'
    },
    {
      icon: MessageSquare,
      title: t('contact.reasons.feedback.title'),
      description: t('contact.reasons.feedback.description'),
      color: 'text-blue-500'
    }
  ]

  const handleEmailClick = () => {
    window.location.href = 'mailto:vincent.si.dev@gmail.com?subject=Contact%20NoteFlow'
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          {t('contact.title')}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {t('contact.subtitle')}
        </p>
      </div>

      {/* Main Contact Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Mail className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl">{t('contact.card.title')}</CardTitle>
          </div>
          <CardDescription>
            {t('contact.card.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Button */}
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Mail className="h-12 w-12 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {t('contact.emailPrompt')}
              </p>
              <p className="text-lg font-semibold text-foreground">
                vincent.si.dev@gmail.com
              </p>
            </div>
            <Button
              onClick={handleEmailClick}
              size="lg"
              className="mt-4"
            >
              <Mail className="h-5 w-5 mr-2" />
              {t('contact.sendEmail')}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {t('contact.canHelpWith')}
              </span>
            </div>
          </div>

          {/* Contact Reasons */}
          <div className="grid gap-4 md:grid-cols-3">
            {contactReasons.map((reason) => {
              const Icon = reason.icon
              return (
                <div
                  key={reason.title}
                  className="p-4 border border-border rounded-lg space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`h-5 w-5 ${reason.color}`} />
                    <h3 className="font-semibold text-sm">{reason.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {reason.description}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Response Time Info */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              {t('contact.responseTime')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('contact.beforeContact.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>{t('contact.beforeContact.tip1')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>{t('contact.beforeContact.tip2')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-1">•</span>
              <span>{t('contact.beforeContact.tip3')}</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
