import DataLoader from 'dataloader'
import { prisma } from '@/config/prisma'
import type { User, Article, Summary, Note } from '@prisma/client'

/**
 * DataLoader utilities to prevent N+1 query problems
 * Batches and caches database requests within a single request context
 *
 * Usage:
 * - Create loaders at request level (new instance per request)
 * - Pass loaders through context to services/controllers
 * - Use loader.load(id) instead of direct Prisma queries
 */

/**
 * User DataLoader
 * Batches user lookups by ID to prevent N+1 queries
 */
export const createUserLoader = () =>
  new DataLoader<string, User | null>(async (userIds: readonly string[]) => {
    const users = await prisma.user.findMany({
      where: {
        id: { in: [...userIds] },
        deletedAt: null,
      },
    })

    const userMap = new Map(users.map(user => [user.id, user]))
    return userIds.map(id => userMap.get(id) || null)
  })

/**
 * Article DataLoader
 * Batches article lookups by ID to prevent N+1 queries
 */
export const createArticleLoader = () =>
  new DataLoader<string, Article | null>(async (articleIds: readonly string[]) => {
    const articles = await prisma.article.findMany({
      where: { id: { in: [...articleIds] } },
    })

    const articleMap = new Map(articles.map(article => [article.id, article]))
    return articleIds.map(id => articleMap.get(id) || null)
  })

/**
 * Summary DataLoader
 * Batches summary lookups by ID to prevent N+1 queries
 */
export const createSummaryLoader = () =>
  new DataLoader<string, Summary | null>(async (summaryIds: readonly string[]) => {
    const summaries = await prisma.summary.findMany({
      where: {
        id: { in: [...summaryIds] },
        deletedAt: null,
      },
    })

    const summaryMap = new Map(summaries.map(summary => [summary.id, summary]))
    return summaryIds.map(id => summaryMap.get(id) || null)
  })

/**
 * Note DataLoader
 * Batches note lookups by ID to prevent N+1 queries
 */
export const createNoteLoader = () =>
  new DataLoader<string, Note | null>(async (noteIds: readonly string[]) => {
    const notes = await prisma.note.findMany({
      where: {
        id: { in: [...noteIds] },
        deletedAt: null,
      },
    })

    const noteMap = new Map(notes.map(note => [note.id, note]))
    return noteIds.map(id => noteMap.get(id) || null)
  })

/**
 * SavedArticles by User DataLoader
 * Batches saved articles lookups by user ID to prevent N+1 queries
 * Returns array of article IDs for each user
 */
export const createUserSavedArticlesLoader = () =>
  new DataLoader<string, string[]>(async (userIds: readonly string[]) => {
    const savedArticles = await prisma.savedArticle.findMany({
      where: { userId: { in: [...userIds] } },
      select: { userId: true, articleId: true },
    })

    const userArticleMap = new Map<string, string[]>()
    for (const saved of savedArticles) {
      const existing = userArticleMap.get(saved.userId) || []
      existing.push(saved.articleId)
      userArticleMap.set(saved.userId, existing)
    }

    return userIds.map(userId => userArticleMap.get(userId) || [])
  })

/**
 * Create all loaders for a request context
 * Should be called once per request and passed through context
 */
export function createLoaders() {
  return {
    userLoader: createUserLoader(),
    articleLoader: createArticleLoader(),
    summaryLoader: createSummaryLoader(),
    noteLoader: createNoteLoader(),
    userSavedArticlesLoader: createUserSavedArticlesLoader(),
  }
}

export type Loaders = ReturnType<typeof createLoaders>
