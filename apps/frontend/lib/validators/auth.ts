import { z } from 'zod'

/**
 * Common passwords to reject (must match backend validation)
 */
const COMMON_PASSWORDS = [
  'password',
  'password123',
  'qwerty',
  'qwerty123',
  'admin',
  'admin123',
  'welcome',
  'welcome123',
  'letmein',
  '123456',
  '12345678',
  '123456789',
]

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})

export const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter (A-Z)')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter (a-z)')
    .regex(/[0-9]/, 'Password must contain at least one number (0-9)')
    .refine(
      (password) => {
        const lowerPassword = password.toLowerCase()
        return !COMMON_PASSWORDS.some((common) =>
          lowerPassword.includes(common.toLowerCase())
        )
      },
      {
        message: 'This password is too common. Please choose a stronger password.',
      }
    ),
  name: z.string().optional(),
})

export type LoginFormData = z.infer<typeof loginSchema>
export type RegisterFormData = z.infer<typeof registerSchema>
