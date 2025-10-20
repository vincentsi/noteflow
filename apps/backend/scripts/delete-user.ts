import { prisma } from '../src/config/prisma'

/**
 * Delete a user by email
 * Usage: npm run tsx scripts/delete-user.ts
 */
async function deleteUser(email: string) {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    })

    if (!user) {
      console.log(`❌ User not found: ${email}`)
      return
    }

    console.log(`Found user: ${user.email} (ID: ${user.id})`)
    console.log(`Created at: ${user.createdAt}`)
    console.log(`Name: ${user.name || 'N/A'}`)

    // Delete user (cascade will delete related records)
    await prisma.user.delete({
      where: { id: user.id },
    })

    console.log(`✅ User deleted successfully: ${email}`)
  } catch (error) {
    console.error('❌ Error deleting user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get email from command line or use default
const email = process.argv[2] || 'test.com@gmail.com'
deleteUser(email)
