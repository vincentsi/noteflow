export type User = {
  id: string
  email: string
  name?: string
  role: 'USER' | 'ADMIN' | 'MODERATOR'
  language?: string
  createdAt: string
  planType?: 'FREE' | 'STARTER' | 'PRO'
  subscriptionStatus?: 'NONE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID'
}

export type Article = {
  id: string
  title: string
  url: string
  excerpt: string
  imageUrl?: string
  source: string
  tags: string[]
  publishedAt: string
  createdAt: string
}

export type SavedArticle = {
  id: string
  userId: string
  articleId: string
  article: Article
  createdAt: string
}
