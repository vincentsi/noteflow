import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Seed RSS feeds with reliable tech/AI sources
 */
async function seedRSSFeeds() {
  console.log('🌱 Seeding RSS feeds...')

  const feeds = [
    // Tech News - General
    {
      name: 'TechCrunch',
      url: 'https://techcrunch.com/feed/',
      tags: ['tech', 'startup', 'innovation'],
      active: true,
    },
    {
      name: 'The Verge',
      url: 'https://www.theverge.com/rss/index.xml',
      tags: ['tech', 'gadgets', 'reviews'],
      active: true,
    },
    {
      name: 'Hacker News',
      url: 'https://news.ycombinator.com/rss',
      tags: ['tech', 'programming', 'startup'],
      active: true,
    },

    // AI Specific
    {
      name: 'OpenAI Blog',
      url: 'https://openai.com/blog/rss.xml',
      tags: ['ai', 'openai', 'research'],
      active: true,
    },
    {
      name: 'Google AI Blog',
      url: 'https://blog.google/technology/ai/rss/',
      tags: ['ai', 'google', 'research'],
      active: true,
    },
    {
      name: 'MIT Technology Review - AI',
      url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed',
      tags: ['ai', 'research', 'innovation'],
      active: true,
    },

    // Developer focused
    {
      name: 'Dev.to',
      url: 'https://dev.to/feed',
      tags: ['dev', 'programming', 'tutorial'],
      active: true,
    },
    {
      name: 'GitHub Blog',
      url: 'https://github.blog/feed/',
      tags: ['dev', 'github', 'opensource'],
      active: true,
    },
    {
      name: 'freeCodeCamp',
      url: 'https://www.freecodecamp.org/news/rss/',
      tags: ['dev', 'tutorial', 'learning'],
      active: true,
    },

    // French Tech (bonus)
    {
      name: 'Numerama',
      url: 'https://www.numerama.com/feed/',
      tags: ['tech', 'french', 'news'],
      active: true,
    },
  ]

  for (const feed of feeds) {
    const created = await prisma.rSSFeed.upsert({
      where: { url: feed.url },
      update: feed,
      create: feed,
    })
    console.log(`✅ ${created.name}`)
  }

  console.log(`\n🎉 Seeded ${feeds.length} RSS feeds!`)
}

seedRSSFeeds()
  .catch((e) => {
    console.error('❌ Error seeding feeds:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
