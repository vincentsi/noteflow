# Testing Guide

## Overview

This project uses Jest for unit and integration testing with the following test structure:

```
src/__tests__/
├── setup.ts                          # Jest configuration
├── helpers/                          # Test helpers and mocks
├── unit/                            # Unit tests (mocked dependencies)
│   └── services/
│       └── auth.service.test.ts     # ✅ 9 tests passing
└── integration/                      # Integration tests (real DB)
    └── auth.test.ts.skip            # Requires test database
```

## Running Tests

```bash
# Run all tests with coverage
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Watch mode for TDD
npm run test:watch
```

## Current Test Coverage

**Unit Tests:** ✅ 9/9 passing
- `auth.service.ts`: 78.78% coverage

**Integration Tests:** ⚠️ Skipped (requires test database)

**Overall Coverage:** 7.24%
- Statements: 7.24% (target: 7%)
- Branches: 5.49% (target: 5%)
- Functions: 7.81% (target: 5%)
- Lines: 7.37% (target: 7%)

## Integration Tests Setup

Integration tests require a PostgreSQL test database. To enable them:

### 1. Create Test Database

```bash
# Using PostgreSQL CLI
psql -U postgres -c "CREATE DATABASE boilerplate_test;"

# Or using Docker
docker run -d \
  --name postgres-test \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=boilerplate_test \
  -p 5433:5432 \
  postgres:16-alpine
```

### 2. Configure Test Environment

The test database URL is configured in `src/__tests__/setup.ts`:

```typescript
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/boilerplate_test'
```

### 3. Run Migrations

```bash
# Set DATABASE_URL for test DB
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/boilerplate_test"

# Run migrations
npm run db:push
```

### 4. Enable Integration Tests

```bash
# Rename the skipped test file
cd src/__tests__/integration
mv auth.test.ts.skip auth.test.ts

# Run all tests
npm test
```

## Test Structure

### Unit Tests

Unit tests mock all external dependencies (database, Redis, email, Sentry):

```typescript
// src/__tests__/unit/services/auth.service.test.ts
import { prismaMock } from '../../setup'

describe('AuthService', () => {
  it('should register user', async () => {
    prismaMock.user.create.mockResolvedValue(mockUser)
    const result = await authService.register(data)
    expect(result).toBeDefined()
  })
})
```

**Mocks configured in `setup.ts`:**
- Prisma Client
- bcryptjs
- jsonwebtoken
- Sentry
- Redis
- Email Service (Resend)

### Integration Tests

Integration tests use a real database connection and test full API flows:

```typescript
// src/__tests__/integration/auth.test.ts
describe('Auth Routes Integration Tests', () => {
  beforeEach(async () => {
    // Clean up test database
    await prisma.refreshToken.deleteMany()
    await prisma.user.deleteMany()
  })

  it('should register a new user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password, name }
    })
    expect(response.statusCode).toBe(200)
  })
})
```

## Writing New Tests

### Unit Test Template

```typescript
import { authService } from '@/services/auth.service'
import { prismaMock } from '../../setup'

describe('MyService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should do something', async () => {
    // Arrange
    prismaMock.model.method.mockResolvedValue(mockData)

    // Act
    const result = await myService.method(input)

    // Assert
    expect(result).toEqual(expected)
    expect(prismaMock.model.method).toHaveBeenCalledWith(input)
  })
})
```

### Integration Test Template

```typescript
import { createApp } from '@/app'
import { prisma } from '@/config/prisma'

describe('My Routes Integration Tests', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await createApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    // Clean up test data
    await prisma.myModel.deleteMany()
  })

  it('should handle request', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/endpoint',
      payload: { data }
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.body)
    expect(body).toHaveProperty('success', true)
  })
})
```

## Improving Coverage

To increase test coverage, prioritize testing:

1. **Critical Services** (highest business value):
   - `auth.service.ts` ✅ (78.78%)
   - `stripe.service.ts` ❌ (0%)
   - `password-reset.service.ts` ❌ (0%)
   - `verification.service.ts` ❌ (0%)

2. **Security-Critical Logic**:
   - Token hashing (`token-hasher.ts`) ✅ (60%)
   - CSRF protection (`csrf.service.ts`) ❌ (0%)
   - Rate limiting
   - Password validation

3. **Business Logic**:
   - Subscription management
   - GDPR compliance
   - Backup/cleanup services

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: boilerplate_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm ci
      - run: npm run db:push
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/boilerplate_test

      - run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/boilerplate_test
```

## Next Steps

1. ✅ Unit tests for `auth.service.ts` (9 tests)
2. ⚠️ Set up test database for integration tests
3. ❌ Add unit tests for `stripe.service.ts`
4. ❌ Add unit tests for `password-reset.service.ts`
5. ❌ Add unit tests for `verification.service.ts`
6. ❌ Add E2E tests with Playwright (frontend)
7. ❌ Add load tests with k6 or Artillery
8. ❌ Add security tests with OWASP ZAP
