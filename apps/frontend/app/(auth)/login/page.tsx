'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useAuth } from '@/providers/auth.provider'
import { useI18n } from '@/lib/i18n/provider'
import { loginSchema, type LoginFormData } from '@/lib/validators/auth'
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

export default function LoginPage() {
  const { login } = useAuth()
  const { t } = useI18n()

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const { handleSubmit: handleFormSubmit } = useFormSubmit({
    onSubmit: login,
    setError: form.setError,
    defaultErrorMessage: ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS,
  })

  // Wrapper to use with React Hook Form
  const onSubmit = (data: LoginFormData) => handleFormSubmit(data)

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('auth.login.title')}</CardTitle>
          <CardDescription>
            {t('auth.login.subtitle')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {form.formState.errors.root && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {form.formState.errors.root.message}
                </div>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.login.emailLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t('auth.login.emailPlaceholder')}
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
                    <FormLabel>{t('auth.login.passwordLabel')}</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={t('auth.login.passwordPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-between">
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground dark:text-gray-400 hover:text-primary dark:hover:text-primary"
                  prefetch
                >
                  {t('auth.login.forgotPassword')}
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? t('auth.login.signingIn') : t('auth.login.signInButton')}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground dark:text-gray-400">
            {t('auth.login.noAccount')}{' '}
            <Link href="/register" className="text-primary hover:underline" prefetch>
              {t('auth.login.signUpLink')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
