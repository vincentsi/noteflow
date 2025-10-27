'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/providers/auth.provider'
import { apiClient } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/lib/i18n/provider'

const settingsSchema = z.object({
  language: z.enum(['fr', 'en']),
})

type SettingsFormData = z.infer<typeof settingsSchema>

export default function SettingsPage() {
  const { t } = useI18n()
  const { user, isLoading } = useAuth()
  const queryClient = useQueryClient()
  const [updateSuccess, setUpdateSuccess] = useState(false)

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    values: {
      language: (user?.language as 'fr' | 'en') || 'fr',
    },
  })

  const onSubmit = async (data: SettingsFormData) => {
    try {
      await apiClient.patch('/api/users/me', {
        language: data.language,
      })

      // Invalidate cache to force refetch
      await queryClient.invalidateQueries({ queryKey: ['me'] })

      setUpdateSuccess(true)
      setTimeout(() => setUpdateSuccess(false), 3000)
    } catch (error: unknown) {
      const errorData = (error as { response?: { data?: { error?: string; message?: string } } })
        ?.response?.data
      const errorMessage = errorData?.error || errorData?.message || 'Failed to update settings'

      form.setError('root', {
        message: errorMessage,
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-muted-foreground">{t('common.messages.loading')}</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-muted-foreground">{t('profile.messages.notAuthenticated')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground">
          {t('settings.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.language.title')}</CardTitle>
          <CardDescription>
            {t('settings.language.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {updateSuccess && (
            <div className="mb-4 p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded">
              {t('settings.messages.updateSuccess')}
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {form.formState.errors.root && (
                <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
                  {form.formState.errors.root.message}
                </div>
              )}

              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.language.label')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('settings.language.selectPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="fr">{t('settings.language.french')}</SelectItem>
                        <SelectItem value="en">{t('settings.language.english')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t('settings.actions.saving') : t('settings.actions.saveChanges')}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.subscription.title')}</CardTitle>
          <CardDescription>
            {t('settings.subscription.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('settings.subscription.planType')}</span>
              <span className="text-sm font-semibold">{user.planType}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('settings.subscription.status')}</span>
              <span className="text-sm">{user.subscriptionStatus}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
