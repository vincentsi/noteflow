import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkImages() {
  const articles = await prisma.article.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      source: true,
    },
  })

  console.log('Latest 5 articles:')
  articles.forEach((a) => {
    console.log(`\nTitle: ${a.title.substring(0, 50)}...`)
    console.log(`Source: ${a.source}`)
    console.log(`Image: ${a.imageUrl || 'NO IMAGE'}`)
  })

  const withImages = await prisma.article.count({
    where: { imageUrl: { not: null } },
  })
  const total = await prisma.article.count()
  console.log(`\n\nTotal articles: ${total}`)
  console.log(`Articles with images: ${withImages}`)

  await prisma.$disconnect()
}

checkImages()
