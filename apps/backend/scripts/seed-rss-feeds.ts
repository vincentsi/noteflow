import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Seed RSS feeds with reliable tech/AI sources
 */
async function seedRSSFeeds() {
  console.log('🌱 Seeding RSS feeds...')

  const feeds = [
    // Developer Communities
    {
      name: 'Hacker News',
      url: 'https://news.ycombinator.com/rss',
      tags: ['dev', 'programming', 'startup', 'tech'],
      active: true,
    },
    {
      name: 'Dev.to',
      url: 'https://dev.to/feed',
      tags: ['dev', 'programming', 'tutorial', 'webdev'],
      active: true,
    },
    {
      name: 'GitHub Blog',
      url: 'https://github.blog/feed/',
      tags: ['dev', 'github', 'opensource', 'tools'],
      active: true,
    },

    // Programming Languages & Frameworks
    {
      name: 'React Blog',
      url: 'https://react.dev/rss.xml',
      tags: ['react', 'javascript', 'frontend', 'framework'],
      active: true,
    },
    {
      name: 'Node.js Blog',
      url: 'https://nodejs.org/en/feed/blog.xml',
      tags: ['nodejs', 'javascript', 'backend', 'runtime'],
      active: true,
    },
    {
      name: 'TypeScript Blog',
      url: 'https://devblogs.microsoft.com/typescript/feed/',
      tags: ['typescript', 'javascript', 'programming', 'microsoft'],
      active: true,
    },

    // AI & Machine Learning for Devs
    {
      name: 'OpenAI Blog',
      url: 'https://openai.com/blog/rss.xml',
      tags: ['ai', 'openai', 'llm', 'research'],
      active: true,
    },
    {
      name: 'Hugging Face Blog',
      url: 'https://huggingface.co/blog/feed.xml',
      tags: ['ai', 'ml', 'nlp', 'opensource'],
      active: true,
    },

    // DevOps & Cloud
    {
      name: 'AWS News Blog',
      url: 'https://aws.amazon.com/blogs/aws/feed/',
      tags: ['aws', 'cloud', 'devops', 'infrastructure'],
      active: true,
    },
    {
      name: 'Docker Blog',
      url: 'https://www.docker.com/blog/feed/',
      tags: ['docker', 'containers', 'devops', 'deployment'],
      active: true,
    },

    // Web Development & Standards
    {
      name: 'web.dev',
      url: 'https://web.dev/feed.xml',
      tags: ['webdev', 'performance', 'best-practices', 'google'],
      active: true,
    },
    {
      name: 'CSS-Tricks',
      url: 'https://css-tricks.com/feed/',
      tags: ['css', 'frontend', 'webdev', 'design'],
      active: true,
    },

    // Tech News for Devs
    {
      name: 'The Verge - Tech',
      url: 'https://www.theverge.com/tech/rss/index.xml',
      tags: ['tech', 'news', 'industry', 'innovation'],
      active: true,
    },
    {
      name: 'Ars Technica',
      url: 'https://feeds.arstechnica.com/arstechnica/index',
      tags: ['tech', 'science', 'news', 'analysis'],
      active: true,
    },

    // French Dev Resources
    {
      name: 'Journal du Net - Développeurs',
      url: 'https://www.journaldunet.com/rss/developpeurs/',
      tags: ['dev', 'french', 'programming', 'tech'],
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
