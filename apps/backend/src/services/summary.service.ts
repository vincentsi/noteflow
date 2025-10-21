import { prisma } from '@/config/prisma'
import { PlanType, SummaryStyle } from '@prisma/client'
import { queueSummary } from '@/queues/summary.queue'

const PLAN_LIMITS = {
  FREE: 5,
  STARTER: 20,
  PRO: Infinity,
} as const

export class SummaryService {
  /**
   * Create a summary generation job
   * Checks plan limits before queueing
   */
  async createSummary(
    userId: string,
    text: string,
    style: SummaryStyle,
    language: 'fr' | 'en'
  ): Promise<{ jobId: string }> {
    // Get user's plan type
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planType: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Check monthly plan limits (PRO = unlimited)
    if (user.planType !== PlanType.PRO) {
      const limit = PLAN_LIMITS[user.planType]

      // Get start of current month
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // Count summaries created this month
      const currentCount = await prisma.summary.count({
        where: {
          userId,
          createdAt: {
            gte: startOfMonth,
          },
        },
      })

      if (currentCount >= limit) {
        throw new Error(
          `Summary limit reached. Your ${user.planType} plan allows ${limit} summaries per month.`
        )
      }
    }

    // Queue the summary generation job
    const job = await queueSummary({
      userId,
      text,
      style,
      language,
    })

    return { jobId: job.id }
  }
}
