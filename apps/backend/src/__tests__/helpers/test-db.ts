import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended'

import { prisma } from '@/config/prisma'

// Mock Prisma for integration tests
jest.mock('@/config/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
  disconnectPrisma: jest.fn(),
}))

beforeEach(() => {
  mockReset(prismaMock)
})

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>
