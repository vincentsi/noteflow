import { prisma } from '@/config/prisma'
import { BaseCrudService } from './base-crud.service'
import { PlanType, type SummaryTemplate } from '@prisma/client'
import type { CreateTemplateBody, UpdateTemplateBody } from '@/schemas/template.schema'

/**
 * Template plan limits
 * FREE: 0 custom templates (system defaults only)
 * STARTER: 3 custom templates
 * PRO: Unlimited custom templates
 */
const TEMPLATE_LIMITS: Record<PlanType, number> = {
  FREE: 0,
  STARTER: 3,
  PRO: Infinity,
}

export class TemplateService extends BaseCrudService<SummaryTemplate> {
  protected modelName = 'SummaryTemplate'
  protected prismaModel = prisma.summaryTemplate

  /**
   * Create a new custom template for user
   * Checks plan limits before creating
   */
  async createTemplate(userId: string, data: CreateTemplateBody) {
    // Get user plan type
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planType: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const limit = TEMPLATE_LIMITS[user.planType]

    // Check plan limit (FREE users cannot create custom templates)
    if (limit === 0) {
      throw new Error(
        `Custom templates are not available on the FREE plan. Upgrade to STARTER or PRO to create custom templates.`
      )
    }

    // For non-PRO users, check current template count
    if (limit !== Infinity) {
      const currentCount = await prisma.summaryTemplate.count({
        where: { userId },
      })

      if (currentCount >= limit) {
        throw new Error(
          `Template limit reached. Your ${user.planType} plan allows ${limit} custom templates.`
        )
      }
    }

    // Create template
    const template = await prisma.summaryTemplate.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        prompt: data.prompt,
        icon: data.icon,
      },
    })

    return template
  }

  /**
   * Get all templates for a user (custom + system defaults)
   * Returns templates ordered by createdAt DESC (most recent first)
   */
  async getUserTemplates(userId: string) {
    const templates = await prisma.summaryTemplate.findMany({
      where: {
        OR: [
          { userId }, // User's custom templates
          { isDefault: true }, // System default templates
        ],
      },
      orderBy: [
        { isDefault: 'desc' }, // System defaults first
        { createdAt: 'desc' }, // Then most recent
      ],
      select: {
        id: true,
        name: true,
        description: true,
        prompt: true,
        icon: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return templates
  }

  /**
   * Get a single template by ID
   * User can only access their own templates or system defaults
   */
  async getTemplateById(templateId: string, userId: string) {
    const template = await prisma.summaryTemplate.findFirst({
      where: {
        id: templateId,
        OR: [
          { userId }, // User's custom template
          { isDefault: true }, // System default template
        ],
      },
    })

    if (!template) {
      throw new Error('Template not found')
    }

    return template
  }

  /**
   * Update a template
   * Only the template owner can update it
   * Cannot update system default templates
   */
  async updateTemplate(templateId: string, userId: string, data: UpdateTemplateBody) {
    // Find template and verify ownership
    const template = await prisma.summaryTemplate.findFirst({
      where: {
        id: templateId,
        userId, // Must be owned by user
      },
    })

    if (!template) {
      throw new Error('Template not found or you do not have permission to update it')
    }

    // Prevent updating system defaults
    if (template.isDefault) {
      throw new Error('Cannot update system default templates')
    }

    // Update template
    const updated = await prisma.summaryTemplate.update({
      where: { id: templateId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.prompt && { prompt: data.prompt }),
        ...(data.icon !== undefined && { icon: data.icon }),
      },
    })

    return updated
  }

  /**
   * Delete a template
   * Only the template owner can delete it
   * Cannot delete system default templates
   */
  async deleteTemplate(templateId: string, userId: string) {
    // Find template and verify ownership
    const template = await prisma.summaryTemplate.findFirst({
      where: {
        id: templateId,
        userId, // Must be owned by user
      },
    })

    if (!template) {
      throw new Error('Template not found or you do not have permission to delete it')
    }

    // Prevent deleting system defaults
    if (template.isDefault) {
      throw new Error('Cannot delete system default templates')
    }

    // Hard delete (templates don't need soft delete)
    await prisma.summaryTemplate.delete({
      where: { id: templateId },
    })
  }

  /**
   * Get template quota for user
   * Useful for displaying to users
   */
  async getTemplateQuota(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planType: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    const limit = TEMPLATE_LIMITS[user.planType]
    const used = await prisma.summaryTemplate.count({
      where: { userId },
    })

    return {
      used,
      limit: limit === Infinity ? 'unlimited' : limit,
      remaining: limit === Infinity ? 'unlimited' : Math.max(0, limit - used),
    }
  }
}

// Export singleton instance
export const templateService = new TemplateService()
