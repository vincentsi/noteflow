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
import { Input } from '@/components/ui/input'
import { useI18n } from '@/lib/i18n/provider'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email address'),
})

type ProfileFormData = z.infer<typeof profileSchema>

export default function ProfilePage() {
  const { t } = useI18n()
  const { user, isLoading } = useAuth()
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      name: user?.name || '',
      email: user?.email || '',
    },
  })

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await apiClient.patch('/api/auth/profile', data)

      // Invalider le cache pour forcer un refetch des données utilisateur
      await queryClient.invalidateQueries({ queryKey: ['me'] })

      setUpdateSuccess(true)
      setIsEditing(false)
      setTimeout(() => setUpdateSuccess(false), 3000)
    } catch (error: unknown) {
      const errorData = (error as { response?: { data?: { error?: string; message?: string } } })
        ?.response?.data
      const errorMessage = errorData?.error || errorData?.message || 'Failed to update profile'

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
        <h1 className="text-3xl font-bold">{t('profile.title')}</h1>
        <p className="text-muted-foreground">
          {t('profile.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t('profile.personalInfo.title')}</CardTitle>
              <CardDescription>
                {t('profile.personalInfo.subtitle')}
              </CardDescription>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                {t('profile.actions.editProfile')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {updateSuccess && (
            <div className="mb-4 p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded">
              {t('profile.messages.updateSuccess')}
            </div>
          )}

          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {form.formState.errors.root && (
                  <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profile.personalInfo.nameLabel')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('profile.personalInfo.namePlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('profile.personalInfo.emailLabel')}</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} placeholder={t('profile.personalInfo.emailPlaceholder')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? t('profile.actions.saving') : t('profile.actions.saveChanges')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      form.reset()
                    }}
                  >
                    {t('profile.actions.cancel')}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('profile.personalInfo.emailLabel')}</dt>
                <dd className="mt-1 text-sm">{user.email}</dd>
              </div>

              {user.name && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">{t('profile.personalInfo.nameLabel')}</dt>
                  <dd className="mt-1 text-sm">{user.name}</dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('profile.personalInfo.userId')}</dt>
                <dd className="mt-1 text-sm font-mono text-xs">{user.id}</dd>
              </div>

              {user.planType && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">{t('profile.personalInfo.plan')}</dt>
                  <dd className="mt-1 text-sm font-semibold">{user.planType}</dd>
                </div>
              )}

              <div>
                <dt className="text-sm font-medium text-muted-foreground">{t('profile.personalInfo.memberSince')}</dt>
                <dd className="mt-1 text-sm">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
