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
