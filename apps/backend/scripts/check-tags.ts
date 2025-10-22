import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkTags() {
  const articles = await prisma.article.findMany({
    select: {
      tags: true,
    },
  })

  const allTags = new Set<string>()
  articles.forEach((article) => {
    article.tags.forEach((tag) => allTags.add(tag))
  })

  const sortedTags = Array.from(allTags).sort()

  console.log(`Total unique tags: ${sortedTags.length}\n`)
  console.log('All tags:')
  sortedTags.forEach((tag) => console.log(`  - ${tag}`))
}

checkTags()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
