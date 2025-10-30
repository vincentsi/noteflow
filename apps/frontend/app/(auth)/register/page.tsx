'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useAuth } from '@/providers/auth.provider'
import { useI18n } from '@/lib/i18n/provider'
import { registerSchema, type RegisterFormData } from '@/lib/validators/auth'
import { useFormSubmit } from '@/lib/hooks/use-form-submit'
import { ERROR_MESSAGES } from '@/lib/constants/errors'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'

export default function RegisterPage() {
  const { register: registerUser } = useAuth()
  const { t } = useI18n()

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
    },
  })

  const { handleSubmit: handleFormSubmit, isSubmitting } = useFormSubmit({
    onSubmit: registerUser,
    setError: form.setError,
    defaultErrorMessage: ERROR_MESSAGES.AUTH.REGISTRATION_FAILED,
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.register.title')}</CardTitle>
          <CardDescription>
            {t('auth.register.subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              {form.formState.errors.root && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {form.formState.errors.root.message}
                </div>
              )}

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.register.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('auth.register.namePlaceholder')}
                        {...field}
                      />
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
                    <FormLabel>{t('auth.register.emailLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('auth.register.emailPlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.register.passwordLabel')}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={t('auth.register.passwordPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? t('auth.register.creatingAccount') : t('auth.register.signUpButton')}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            {t('auth.register.haveAccount')}{' '}
            <Link href="/login" className="text-primary hover:underline">
              {t('auth.register.signInLink')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
