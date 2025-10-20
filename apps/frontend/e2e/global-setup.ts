import { chromium, FullConfig } from '@playwright/test'
import { TEST_USERS, TEST_CONFIG } from './fixtures/test-data'

/**
 * Global Setup for Playwright E2E Tests
 *
 * This file runs once before all tests to:
 * 1. Wait for backend/frontend to be ready
 * 2. Seed test users in the database
 * 3. Clean up stale test data
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 */
async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global E2E setup...')

  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // 1. Wait for backend to be ready
    console.log('⏳ Waiting for backend...')
    await page.goto(`${TEST_CONFIG.backend.url}${TEST_CONFIG.backend.healthCheck}`, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    console.log('✅ Backend is ready')

    // 2. Wait for frontend to be ready
    console.log('⏳ Waiting for frontend...')
    await page.goto(TEST_CONFIG.frontend.url, {
      waitUntil: 'networkidle',
      timeout: 60000,
    })
    console.log('✅ Frontend is ready')

    // 3. Seed test users via test-setup API
    console.log('🌱 Seeding test users...')
    await seedTestUsers()
    console.log('✅ Test users seeded')

    console.log('🎉 Global setup completed successfully!')
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }
}

/**
 * Seed test users in the database via test-setup API
 * Creates or updates users with proper planType
 */
async function seedTestUsers() {
  const users = [
    { ...TEST_USERS.existing, planType: 'FREE' },
    { ...TEST_USERS.free, planType: 'FREE' },
    { ...TEST_USERS.pro, planType: 'PRO' },
    { ...TEST_USERS.starter, planType: 'STARTER' },
    { ...TEST_USERS.duplicate, planType: 'FREE' },
  ]

  try {
    console.log(`  → Creating ${users.length} test users...`)

    const response = await fetch(`${TEST_CONFIG.backend.url}/api/test-setup/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users }),
    })

    if (!response.ok) {
      throw new Error(`Failed to seed users: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`    ✅ ${data.message}`)

    // Log each user with their planType
    data.users.forEach((user: any) => {
      console.log(`    ✓ ${user.email} (${user.planType})`)
    })
  } catch (error) {
    console.error('    ❌ Failed to seed users:', error)
    throw error
  }
}

export default globalSetup
