import { logger } from '@/utils/logger'
import { env } from '../config/env'

/**
 * Type for Resend client
 */
type ResendClient = {
  emails: {
    send: (options: {
      from: string
      to: string
      subject: string
      html: string
    }) => Promise<unknown>
  }
}

let resendInstance: ResendClient | null = null

/**
 * Initializes Resend client (lazy loading)
 * Only loads package if RESEND_API_KEY is configured
 */
async function getResendClient(): Promise<ResendClient | null> {
  if (!env.RESEND_API_KEY) {
    return null
  }

  if (!resendInstance) {
    try {
      const { Resend } = await import('resend')
      resendInstance = new Resend(env.RESEND_API_KEY) as unknown as ResendClient
    } catch {
      logger.warn('⚠️  Resend package not installed. Run: npm install resend')
      return null
    }
  }

  return resendInstance
}

/**
 * Email sending service with Resend
 * Development: displays links in console
 * Production: sends via Resend
 *
 * Required configuration:
 * - RESEND_API_KEY=re_xxxxx (production only)
 * - EMAIL_FROM=noreply@yourdomain.com
 */
export class EmailService {
  /**
   * Sends verification email with token link
   * @param email - Recipient email
   * @param token - Verification token
   */
  static async sendVerificationEmail(
    email: string,
    token: string
  ): Promise<void> {
    const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`

    if (env.NODE_ENV === 'development') {
      logger.info('\n📧 ═══════════════════════════════════════════')
      logger.info('   VERIFICATION EMAIL')
      logger.info('═══════════════════════════════════════════')
      logger.info(`To: ${email}`)
      logger.info(`URL: ${verificationUrl}`)
      logger.info(`Token: ${token}`)
      logger.info('═══════════════════════════════════════════\n')
      return
    }

    const resend = await getResendClient()
    if (!resend) {
      const error = new Error(
        'Email service not configured - RESEND_API_KEY missing'
      )
      logger.error({ error: error }, '❌')

      if (env.NODE_ENV === 'production') {
        throw error
      }

      logger.warn(`⚠️  Email not sent to: ${email} (dev/staging mode)`)
      return
    }

    try {
      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: email,
        subject: 'Verify your email address',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
              <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h1 style="color: #333; margin-bottom: 20px;">Verify your email</h1>
                <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                  Thank you for signing up! Click the button below to verify your email address:
                </p>
                <a href="${verificationUrl}"
                   style="display: inline-block; background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">
                  Verify my email
                </a>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  Or copy this link into your browser:<br>
                  <a href="${verificationUrl}" style="color: #007bff; word-break: break-all;">${verificationUrl}</a>
                </p>
                <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  This link expires in 24 hours.<br>
                  If you didn't create an account, please ignore this email.
                </p>
              </div>
            </body>
          </html>
        `,
      })

      logger.info(`✅ Verification email sent to ${email}`)
    } catch (error) {
      logger.error({ error: error }, '❌ Failed to send verification email:')
      throw new Error('Failed to send verification email')
    }
  }

  /**
   * Sends password reset email
   * @param email - Recipient email
   * @param token - Reset token
   */
  static async sendPasswordResetEmail(
    email: string,
    token: string
  ): Promise<void> {
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`

    if (env.NODE_ENV === 'development') {
      logger.info('\n📧 ═══════════════════════════════════════════')
      logger.info('   PASSWORD RESET EMAIL')
      logger.info('═══════════════════════════════════════════')
      logger.info(`To: ${email}`)
      logger.info(`URL: ${resetUrl}`)
      logger.info(`Token: ${token}`)
      logger.info('═══════════════════════════════════════════\n')
      return
    }

    const resend = await getResendClient()
    if (!resend) {
      const error = new Error(
        'Email service not configured - RESEND_API_KEY missing'
      )
      logger.error({ error: error }, '❌')

      if (env.NODE_ENV === 'production') {
        throw error
      }

      logger.warn(`⚠️  Email not sent to: ${email} (dev/staging mode)`)
      return
    }

    try {
      await resend.emails.send({
        from: env.EMAIL_FROM,
        to: email,
        subject: 'Password reset request',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
              <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h1 style="color: #333; margin-bottom: 20px;">Password Reset</h1>
                <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                  You requested a password reset. Click the button below to create a new password:
                </p>
                <a href="${resetUrl}"
                   style="display: inline-block; background-color: #dc3545; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">
                  Reset my password
                </a>
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  Or copy this link into your browser:<br>
                  <a href="${resetUrl}" style="color: #dc3545; word-break: break-all;">${resetUrl}</a>
                </p>
                <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 30px 0;">
                  <p style="color: #856404; margin: 0; font-size: 14px; font-weight: bold;">
                    ⚠️ This link expires in 1 hour.
                  </p>
                </div>
                <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                  If you didn't request this reset, please ignore this email.<br>
                  Your password will remain unchanged.
                </p>
              </div>
            </body>
          </html>
        `,
      })

      logger.info(`✅ Password reset email sent to ${email}`)
    } catch (error) {
      logger.error({ error: error }, '❌ Failed to send password reset email:')
      throw new Error('Failed to send password reset email')
    }
  }
}
