import { prisma } from '../src/config/prisma'

/**
 * List all users in database
 * Usage: npm run tsx scripts/list-users.ts
 */
async function listUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        deletedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    console.log(`\n📊 Total users: ${users.length}\n`)

    if (users.length === 0) {
      console.log('No users found in database.')
      return
    }

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Name: ${user.name || 'N/A'}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Verified: ${user.emailVerified ? '✅' : '❌'}`)
      console.log(`   Created: ${user.createdAt.toISOString()}`)
      console.log(`   Deleted: ${user.deletedAt ? '🗑️ Yes' : 'No'}`)
      console.log('')
    })
  } catch (error) {
    console.error('❌ Error listing users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listUsers()
