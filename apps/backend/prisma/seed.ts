import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Hash password for test users
  const hashedPassword = await bcrypt.hash('SecurePassword123!', 10)

  // Create test user (for E2E tests)
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: hashedPassword,
      name: 'Test User',
      role: Role.USER,
      emailVerified: true,
    },
  })
  console.log('✅ Created test user:', testUser.email)

  // Create free user (for subscription tests)
  const freeUser = await prisma.user.upsert({
    where: { email: 'freeuser@example.com' },
    update: {},
    create: {
      email: 'freeuser@example.com',
      password: hashedPassword,
      name: 'Free User',
      role: Role.USER,
      emailVerified: true,
      planType: 'FREE',
    },
  })
  console.log('✅ Created free user:', freeUser.email)

  // Create PRO user (for subscription tests)
  const proUser = await prisma.user.upsert({
    where: { email: 'prouser@example.com' },
    update: {},
    create: {
      email: 'prouser@example.com',
      password: hashedPassword,
      name: 'PRO User',
      role: Role.USER,
      emailVerified: true,
      planType: 'PRO',
    },
  })
  console.log('✅ Created PRO user:', proUser.email)

  // Create admin user (for admin tests)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Admin User',
      role: Role.ADMIN,
      emailVerified: true,
      planType: 'BUSINESS',
    },
  })
  console.log('✅ Created admin user:', adminUser.email)

  console.log('🎉 Database seeding completed!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
