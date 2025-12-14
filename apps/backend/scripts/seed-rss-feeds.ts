import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Seed RSS feeds with reliable tech/AI sources
 */
async function seedRSSFeeds() {
  console.log('🌱 Seeding RSS feeds...')

  const feeds = [
    // ===== DEVELOPER COMMUNITIES (Daily updates) =====
    {
      name: 'Hacker News',
      url: 'https://hnrss.org/frontpage',
      tags: ['tech-news', 'programming', 'startup', 'community'],
      active: true,
    },
    {
      name: 'Dev.to',
      url: 'https://dev.to/feed',
      tags: ['webdev', 'tutorial', 'programming', 'community'],
      active: true,
    },
    {
      name: 'freeCodeCamp',
      url: 'https://freecodecamp.org/news/rss',
      tags: ['tutorial', 'webdev', 'data-science', 'learning'],
      active: true,
    },
    {
      name: 'Stack Overflow Blog',
      url: 'https://stackoverflow.blog/feed',
      tags: ['programming', 'career', 'best-practices', 'community'],
      active: true,
    },
    // ===== WEB PERFORMANCE & BEST PRACTICES =====
    {
      name: 'web.dev',
      url: 'https://web.dev/feed.xml',
      tags: ['performance', 'best-practices', 'webdev', 'google'],
      active: true,
    },

    // ===== JAVASCRIPT & FRONTEND FRAMEWORKS =====
    {
      name: 'React Blog',
      url: 'https://reactjs.org/feed.xml',
      tags: ['react', 'javascript', 'frontend'],
      active: true,
    },
    {
      name: 'Vue.js News',
      url: 'https://news.vuejs.org/feed.xml',
      tags: ['vue', 'javascript', 'frontend'],
      active: true,
    },
    {
      name: 'Angular Blog',
      url: 'https://blog.angular.io/feed',
      tags: ['angular', 'typescript', 'frontend'],
      active: true,
    },
    {
      name: 'Svelte Blog',
      url: 'https://svelte.dev/blog/rss.xml',
      tags: ['svelte', 'javascript', 'frontend'],
      active: true,
    },
    {
      name: 'Next.js Blog',
      url: 'https://nextjs.org/feed.xml',
      tags: ['nextjs', 'react', 'ssr', 'fullstack'],
      active: true,
    },

    // ===== BACKEND & LANGUAGES =====
    {
      name: 'Node.js Blog',
      url: 'https://nodejs.org/en/feed/blog.xml',
      tags: ['nodejs', 'javascript', 'backend'],
      active: true,
    },
    {
      name: 'TypeScript Blog',
      url: 'https://devblogs.microsoft.com/typescript/feed/',
      tags: ['typescript', 'javascript', 'programming'],
      active: true,
    },
    {
      name: 'Go Blog',
      url: 'https://go.dev/blog/feed.atom',
      tags: ['go', 'golang', 'backend', 'programming'],
      active: true,
    },
    {
      name: 'Rust Blog',
      url: 'https://blog.rust-lang.org/feed.xml',
      tags: ['rust', 'systems-programming', 'performance'],
      active: true,
    },
    {
      name: 'Real Python',
      url: 'https://realpython.com/atom.xml',
      tags: ['python', 'tutorial', 'backend', 'data-science'],
      active: true,
    },

    // ===== AI & MACHINE LEARNING =====
    {
      name: 'OpenAI Blog',
      url: 'https://openai.com/news/rss.xml',
      tags: ['ai', 'llm', 'gpt', 'research'],
      active: true,
    },
    {
      name: 'Anthropic',
      url: 'https://www.anthropic.com/news/rss.xml',
      tags: ['ai', 'llm', 'claude', 'ai-safety'],
      active: true,
    },
    {
      name: 'Google AI Blog',
      url: 'http://feeds.feedburner.com/blogspot/gJZg',
      tags: ['ai', 'ml', 'tensorflow', 'research'],
      active: true,
    },
    {
      name: 'DeepMind Blog',
      url: 'https://deepmind.google/blog/rss.xml',
      tags: ['ai', 'research', 'deep-learning'],
      active: true,
    },
    {
      name: 'Hugging Face Blog',
      url: 'https://huggingface.co/blog/feed.xml',
      tags: ['ai', 'ml', 'nlp', 'transformers'],
      active: true,
    },
    {
      name: 'Machine Learning Mastery',
      url: 'http://machinelearningmastery.com/blog/feed',
      tags: ['ml', 'tutorial', 'python', 'deep-learning'],
      active: true,
    },
    {
      name: 'Towards Data Science',
      url: 'https://towardsdatascience.com/feed',
      tags: ['ml', 'data-science', 'ai', 'tutorial'],
      active: true,
    },

    // ===== DEVOPS & CLOUD =====
    {
      name: 'Kubernetes Blog',
      url: 'https://kubernetes.io/feed.xml',
      tags: ['kubernetes', 'devops', 'cloud-native'],
      active: true,
    },
    {
      name: 'Docker Blog',
      url: 'https://www.docker.com/blog/feed/',
      tags: ['docker', 'containers', 'devops'],
      active: true,
    },
    {
      name: 'CNCF Blog',
      url: 'https://www.cncf.io/feed/',
      tags: ['cloud-native', 'kubernetes', 'devops'],
      active: true,
    },
    {
      name: 'AWS Blog',
      url: 'https://aws.amazon.com/blogs/aws/feed/',
      tags: ['aws', 'cloud', 'infrastructure'],
      active: true,
    },
    {
      name: 'Google Cloud Blog',
      url: 'https://cloudblog.withgoogle.com/rss',
      tags: ['gcp', 'cloud', 'google-cloud'],
      active: true,
    },
    {
      name: 'The New Stack',
      url: 'https://thenewstack.io/feed',
      tags: ['cloud-native', 'devops', 'kubernetes'],
      active: true,
    },

    // ===== MOBILE DEVELOPMENT =====
    {
      name: 'React Native Blog',
      url: 'https://reactnative.dev/blog/rss.xml',
      tags: ['react-native', 'mobile', 'javascript'],
      active: true,
    },
    {
      name: 'Flutter on Medium',
      url: 'https://medium.com/feed/flutter',
      tags: ['flutter', 'dart', 'mobile'],
      active: true,
    },
    {
      name: 'Android Developers Blog',
      url: 'https://feeds.feedburner.com/blogspot/hsDu',
      tags: ['android', 'kotlin', 'mobile'],
      active: true,
    },
    {
      name: 'Hacking with Swift',
      url: 'https://www.hackingwithswift.com/articles/rss',
      tags: ['swift', 'ios', 'mobile', 'tutorial'],
      active: true,
    },

    // ===== WEB DESIGN & CSS =====
    {
      name: 'CSS-Tricks',
      url: 'https://css-tricks.com/feed/',
      tags: ['css', 'frontend', 'design'],
      active: true,
    },
    {
      name: 'Smashing Magazine',
      url: 'https://www.smashingmagazine.com/feed',
      tags: ['css', 'javascript', 'ux', 'design'],
      active: true,
    },
    {
      name: 'A List Apart',
      url: 'https://alistapart.com/main/feed/',
      tags: ['web-standards', 'design', 'accessibility'],
      active: true,
    },
    {
      name: 'Codrops',
      url: 'https://tympanus.net/codrops/feed',
      tags: ['css', 'javascript', 'design', 'inspiration'],
      active: true,
    },

    // ===== ENGINEERING BLOGS (Companies) =====
    {
      name: 'GitHub Engineering',
      url: 'https://github.blog/feed/',
      tags: ['engineering', 'devops', 'opensource'],
      active: true,
    },
    {
      name: 'Netflix Tech Blog',
      url: 'https://netflixtechblog.com/feed',
      tags: ['engineering', 'microservices', 'cloud', 'scale'],
      active: true,
    },
    {
      name: 'Vercel Blog',
      url: 'https://vercel.com/atom',
      tags: ['nextjs', 'deployment', 'frontend'],
      active: true,
    },
    {
      name: 'Stripe Engineering',
      url: 'https://stripe.com/blog/feed.rss',
      tags: ['engineering', 'api', 'infrastructure'],
      active: true,
    },

    // ===== TECH NEWS =====
    {
      name: 'TechCrunch',
      url: 'http://feeds.feedburner.com/TechCrunch/',
      tags: ['tech-news', 'startup', 'funding'],
      active: true,
    },
    {
      name: 'The Verge',
      url: 'https://www.theverge.com/rss/index.xml',
      tags: ['tech-news', 'reviews', 'culture'],
      active: true,
    },
    {
      name: 'Ars Technica',
      url: 'http://feeds.arstechnica.com/arstechnica/index/',
      tags: ['tech-news', 'science', 'analysis'],
      active: true,
    },
    {
      name: 'MIT Technology Review',
      url: 'https://www.technologyreview.com/feed/',
      tags: ['innovation', 'research', 'future-tech'],
      active: true,
    },

    // ===== FRENCH CONTENT =====
    {
      name: 'Numerama',
      url: 'https://www.numerama.com/feed/rss/',
      tags: ['tech-news', 'french', 'science', 'culture'],
      active: true,
    },
    {
      name: '01net',
      url: 'https://www.01net.com/feed',
      tags: ['tech-news', 'french', 'tests', 'actualite'],
      active: true,
    },
    {
      name: 'Developpez.com',
      url: 'https://www.developpez.com/index/rss',
      tags: ['programming', 'french', 'tutorial', 'community'],
      active: true,
    },
    {
      name: 'Next INpact',
      url: 'https://www.nextinpact.com/rss/news.xml',
      tags: ['tech-news', 'french', 'droit', 'analyse'],
      active: true,
    },
    {
      name: 'FrenchWeb',
      url: 'https://www.frenchweb.fr/feed',
      tags: ['startup', 'french', 'innovation', 'digital'],
      active: true,
    },
  ]

  let created = 0
  let skipped = 0
  let errors = 0

  for (const feed of feeds) {
    try {
      const result = await prisma.rSSFeed.upsert({
        where: { name: feed.name },
        update: { url: feed.url, tags: feed.tags, active: feed.active },
        create: feed,
      })
      console.log(`✅ ${result.name}`)
      created++
    } catch (error) {
      // Try to create directly if upsert fails
      try {
        await prisma.rSSFeed.create({
          data: feed,
        })
        console.log(`✅ ${feed.name} (created after upsert failed)`)
        created++
      } catch (createError: any) {
        if (createError.code === 'P2002') {
          console.log(`⚠️  Skipped ${feed.name} (already exists)`)
          skipped++
        } else {
          console.error(`❌ Error with ${feed.name}:`, createError.message)
          errors++
        }
      }
    }
  }

  console.log(`\n🎉 Seeding complete!`)
  console.log(`   Created: ${created}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Errors: ${errors}`)
  console.log(`   Total feeds: ${feeds.length}`)
}

seedRSSFeeds()
  .catch(e => {
    console.error('❌ Error seeding feeds:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
