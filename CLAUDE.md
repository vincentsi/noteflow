# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Rules

**CRITICAL - Follow these rules at all times:**
- NEVER suggest to "continue tomorrow" or stop working
- NEVER say you'll "do it faster" or promise speed improvements
- NEVER make decisions about when to stop or continue work
- The USER decides when to stop, continue, or change direction
- Focus ONLY on executing the current task as requested
- Wait for USER instructions before moving to next steps

## Project Overview

NoteFlow is an AI-powered platform for developers with three main features:

1. **Veille IA (AI Watch)** - RSS feed aggregation for dev/AI content with save functionality
2. **ResumeIA (SummaryAI)** - AI-powered content summarization (text/PDF/URL) with 6 styles
3. **MyNote** - Markdown note-taking with tag organization and public post conversion

**Tech Stack:** Turborepo monorepo, Fastify 5 backend, Next.js 15 frontend, Prisma 6 + PostgreSQL 16, Redis 7, BullMQ, OpenAI

**Development Approach:** Test-Driven Development (TDD) following the Red-Green-Refactor cycle. See `plan/TDD-WORKFLOW.md` for feature-by-feature implementation workflow.

## Core Commands

### Development

```bash
# Start all apps (backend, frontend, landing)
npm run dev

# Backend: http://localhost:3001
# Frontend: http://localhost:3000
# Landing: http://localhost:3002

# Build all packages
npm run build

# Run all tests
npm test

# Lint and type-check
npm run lint
npm run type-check
```

### Backend-Specific (cd apps/backend)

```bash
# Database operations
npm run db:generate      # Generate Prisma client (run after schema changes)
npm run db:migrate       # Create and apply migration
npm run db:push          # Push schema without migration (dev only)
npm run db:studio        # Open Prisma Studio UI

# Development
npm run dev              # Start with hot reload (tsx watch)
npm run build            # TypeScript compilation with tsc-alias

# Testing
npm test                 # Run all tests with coverage
npm run test:watch       # Watch mode
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests (--runInBand)
```

### Frontend-Specific (cd apps/frontend)

```bash
npm run dev              # Next.js dev server
npm run build            # Production build
npm run test:e2e         # Playwright E2E tests
```

## Architecture Overview

### Monorepo Structure

- **apps/backend/** - Fastify 5 API with Prisma ORM
- **apps/frontend/** - Next.js 15 App Router with TanStack Query
- **apps/landing/** - Marketing site
- **packages/eslint-config/** - Shared ESLint configuration
- **packages/tsconfig/** - Shared TypeScript configs
- **plan/** - Project documentation (MVP plan, architecture, TDD workflow, testing strategy)

### Backend Architecture (Fastify)

**Service Layer Pattern:**

- Controllers handle HTTP requests/responses
- Services contain business logic
- Prisma client for database operations
- BullMQ queues for async jobs (AI summaries, RSS fetching)

**Key Services (implemented):**

- `auth.service.ts` - JWT authentication, token management
- `stripe.service.ts` - Subscription management with Stripe customer deletion
- `email.service.ts` - Email via Resend
- `cache.service.ts` - Redis caching with centralized key helpers
- `distributed-lock.service.ts` - Redlock for distributed locking (race condition prevention)
- `gdpr.service.ts` - Data export/deletion with Stripe integration
- `article.service.ts` - Article CRUD with distributed locks for save operations
- `rss.service.ts` - RSS feed fetching and parsing
- `summary.service.ts` - Summary management with pagination
- `ai.service.ts` - OpenAI integration for summaries
- `note.service.ts` - Note CRUD operations
- `post.service.ts` - Public post management (to be created)

**Middleware Stack:**

- `auth.middleware.ts` - JWT validation
- `rbac.middleware.ts` - Role-based access control
- `subscription.middleware.ts` - Plan-based feature limiting with request-level caching
- `loadSubscription` middleware - Request-level subscription caching to reduce DB queries

**Utilities:**

- `plan-limiter.ts` - Usage quota enforcement with plan type validation
- `cache-key-helpers.ts` - Centralized cache key generation (prevents month-boundary race conditions)
- `error-response.ts` - Standardized error handling
- `custom-errors.ts` - Custom error classes
- `controller-wrapper.ts` - Reusable controller patterns (auth handlers, param handlers)
- `rate-limit-configs.ts` - Centralized rate-limiting presets
- `common-responses.schema.ts` - Reusable OpenAPI response schemas

### Database Schema (Prisma)

**Core Models:**

- `User` - Authentication, plan type (FREE/STARTER/PRO), language (fr/en)
- `Article` - RSS articles with source tracking
- `SavedArticle` - User-article many-to-many relation
- `Summary` - AI-generated summaries with contentType (TEXT/URL/PDF) and style (SHORT/TWEET/THREAD/BULLET_POINT/TOP3/MAIN_POINTS)
- `Note` - Markdown notes with tags array
- `Post` - Public posts with slug and visibility flag

**Auth/Subscription Models:**

- `RefreshToken`, `VerificationToken`, `PasswordResetToken`, `CsrfToken`
- `Subscription` - Stripe subscription tracking

**Plan Limits:**

- FREE: 10 articles, 5 summaries/month, 20 notes
- STARTER (6€/month): 50 articles, 20 summaries/month, 100 notes
- PRO (15€/month): Unlimited all

### Frontend Architecture (Next.js 15)

**App Router Structure:**

- `(auth)/` - Auth pages (login, register, verify-email, reset-password)
- `(dashboard)/` - Protected dashboard, profile, settings, pricing
- `(admin)/` - Admin panel (users, subscriptions)

**State Management:**

- TanStack Query for server state caching
- React Hook Form + Zod for forms
- Auth context via `providers/auth.provider.tsx`

**UI Components:**

- shadcn/ui with Tailwind CSS 4
- Theme provider for dark mode
- Offline indicator component

## Development Workflow

### TDD Cycle (CRITICAL)

This project follows strict Test-Driven Development. **NEVER skip tests.**

1. **Write test first** (RED ❌) - Test should fail
2. **Implement feature** (GREEN ✅) - Make test pass
3. **Refactor** (♻️) - Clean up code
4. **Commit** - Simple message format
5. **Next feature** - Only proceed when tests pass

See `plan/TDD-WORKFLOW.md` for ~50 detailed features with test code and implementation checklists.

### Adding New Features

**Backend Feature Example:**

1. Add Prisma model if needed → `npx prisma migrate dev --name <name>`
2. Write service tests in `src/__tests__/unit/services/<name>.service.test.ts`
3. Run test (should fail): `npm test -- <name>.service.test.ts`
4. Implement service in `src/services/<name>.service.ts`
5. Create Zod schema in `src/schemas/<name>.schema.ts`
6. Create controller in `src/controllers/<name>.controller.ts` - **Use controller wrappers** from `controller-wrapper.ts`:
   - `createAuthHandler()` for POST/PUT with body
   - `createAuthQueryHandler()` for GET with query params
   - `createAuthParamHandler()` for params-only operations
   - `createAuthParamBodyHandler()` for params + body operations
7. Add routes in `src/routes/<name>.route.ts` - **Use common schemas**:
   - Import `standardResponses()`, `createResponses()`, `errorResponse` from `common-responses.schema.ts`
   - Import rate-limit presets from `rate-limit-configs.ts`
8. Register routes in `src/app.ts`
9. Write integration tests in `src/__tests__/integration/<name>.test.ts`
10. Verify all tests pass: `npm test`
11. Commit: `feat: add <feature-name>`

**BullMQ Queue Pattern:**

- Queue definition: `src/queues/<name>.queue.ts`
- Worker implementation: `src/queues/<name>.worker.ts`
- Use Redis for job storage
- Handle retries and error cases

### Prisma Workflow

**After schema changes:**

```bash
npx prisma migrate dev --name <descriptive_name>  # Creates migration + generates client
npx prisma generate                                # Regenerate client only
```

**⚠️ CRITICAL: Reset BOTH databases after schema changes:**

```bash
# 1. Reset development database
npx prisma migrate reset --force

# 2. Reset test database (REQUIRED!)
DATABASE_URL=postgresql://postgres:0771@localhost:5432/noteflow_test \
  npx prisma migrate reset --force
```

**Why reset test DB?** Jest tests use a separate `noteflow_test` database (configured in `src/__tests__/setup.ts`). If you only reset `noteflow_dev`, tests will fail with `"The column 'colonne' does not exist"` errors because the test database has an outdated schema.

See `plan/TROUBLESHOOTING-TESTS.md` for detailed troubleshooting.

### Git Commit Messages

**CRITICAL: Keep commit messages concise and single-line**

Follow conventional commits with ONE LINE only:

- `feat: add article save functionality`
- `fix: correct RSS parsing for malformed feeds`
- `test: add unit tests for SummaryService`
- `chore: update dependencies`

**Rules:**
- NEVER add multi-line descriptions, explanations, or "Generated with Claude Code" footers
- ONE single line maximum per commit message
- NO bullet points, NO detailed explanations in commit body
- Keep it short and descriptive (under 72 characters)

### Environment Variables

**Backend (.env):**

- `DATABASE_URL` - PostgreSQL connection (noteflow_dev)
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - 64-char hex strings
- `REDIS_URL` - Redis connection (optional, falls back gracefully)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Stripe integration
- `OPENAI_API_KEY` - **REQUIRED** for AI summaries (min 20 chars, validated in env schema)
- `RESEND_API_KEY` - Email service (optional)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/test/production)

**Frontend (.env.local):**

- `NEXT_PUBLIC_API_URL` - Backend API URL (http://localhost:3001)

### Testing Strategy

**Unit Tests (90%+ coverage):**

- Mock Prisma client with `jest-mock-extended`
- Mock external APIs (OpenAI, Stripe, Resend)
- Test services in isolation
- Run: `npm run test:unit`

**Integration Tests (80%+ coverage):**

- Use real Prisma with test database (`noteflow_test`)
- Test full request/response cycle
- Run with `--runInBand` to avoid race conditions
- Run: `npm run test:integration`

**⚠️ Test Database Setup:**

Tests use a separate database configured in `src/__tests__/setup.ts`:
```typescript
DATABASE_URL = 'postgresql://postgres:0771@localhost:5432/noteflow_test'
```

If tests fail with "column does not exist" errors, reset the test database:
```bash
DATABASE_URL=postgresql://postgres:0771@localhost:5432/noteflow_test \
  npx prisma migrate reset --force
```

**E2E Tests (Playwright):**

- Test critical user flows
- Auth, subscription, GDPR flows
- Run: `npm run test:e2e` (from frontend)

**Current Test Coverage:**

- 447/448 tests passing (99.2%)
- 41%+ statement coverage
- All critical and high priority bugs fixed

### Plan Limit Enforcement

Create middleware to check user plan limits before operations:

- Check `user.planType` from JWT
- Query usage counts (articles saved, summaries created this month, notes count)
- Compare against plan limits (see MVP-PLAN.md section 5)
- Return 403 with upgrade message if exceeded

### i18n Support

- Use `next-i18next` for frontend translations
- User language stored in `User.language` (default: "fr")
- Support French and English
- Translation files: `lib/i18n/fr.json`, `lib/i18n/en.json`

### BullMQ Job Processing

**Summary Queue:**

- User requests summary → Add job to queue
- Worker picks up job → Call OpenAI API
- Update Summary record with result
- Handle rate limits and retries

**RSS Queue:**

- Periodic job (cron) → Fetch configured RSS feeds
- Parse feed → Create/update Article records
- Handle duplicate URLs (unique constraint)

## Documentation

- **plan/INDEX.md** - Documentation navigation guide
- **plan/MVP-PLAN.md** - Complete product specification with data models, pricing, KPIs
- **plan/ARCHITECTURE.md** - Detailed technical architecture and service descriptions
- **plan/TDD-WORKFLOW.md** - Feature-by-feature development checklist (50+ features)
- **plan/TESTING-STRATEGY.md** - Test types, coverage targets, TDD examples
- **plan/CODE-ANALYSIS-REPORT.md** - Code quality analysis with all fixes applied (96/100 score)
- **plan/TROUBLESHOOTING-TESTS.md** - Solutions for common test issues (Jest, Prisma, databases)
- **README.md** - Quick start, tech stack, project structure

## Important Notes

### Code Quality Rules

**CRITICAL: ESLint Rules Must Be Followed**

- NEVER disable ESLint rules with `// eslint-disable` comments
- NEVER use `@ts-ignore` or `@ts-expect-error` to suppress TypeScript errors
- If ESLint complains, fix the underlying issue instead of disabling the rule
- If a rule genuinely needs to be changed project-wide, discuss it first and update the ESLint config file
- Code quality is non-negotiable - all warnings and errors must be resolved properly

🚨 **BEFORE editing any files, you MUST Read at least 3 files** that will help you understand how to make coherent and consistent changes.

This is **NON-NEGOTIABLE**. Do not skip this step under any circumstances. Reading existing files ensures:

- Code consistency with project patterns
- Proper understanding of conventions
- Following established architecture
- Avoiding breaking changes

**Types of files you MUST read:**

1. **Similar files**: Read files that do similar functionality to understand patterns and conventions
2. **Imported dependencies**: Read the definition/implementation of any imports you're not 100% sure how to use correctly - understand their API, types, and usage patterns
3. **Related middleware/services**: Understand how existing code handles similar use cases

**Steps to follow:**

1. Read at least 4 relevant existing files (similar functionality + imported dependencies)
2. Understand the patterns, conventions, and API usage
3. Only then proceed with creating/editing files

### Security & Performance Best Practices

**Race Condition Prevention:**

- Use `DistributedLockService.executeWithLock()` for critical operations
- Example: Article save operations to prevent duplicate limit checks
- Lock timeout: 5000ms typical, adjust based on operation

**Cache Management:**

- Use centralized cache keys via `cache-key-helpers.ts`
- Never use `JSON.stringify()` directly for cache keys (causes collision with different key orders)
- Use `buildArticleCacheKey()` which sorts keys alphabetically
- Example: `{ a: 1, b: 2 }` and `{ b: 2, a: 1 }` produce the same key

**Request-Level Caching:**

- Use `loadSubscription` middleware to cache subscription data per request
- Reduces DB queries by ~66% for subscription checks
- Pattern: Load once, reuse throughout request lifecycle

**Error Messages:**

- NEVER expose email existence in error messages (prevents user enumeration)
- Use generic errors: "Registration failed. Please check your information."
- Log sensitive info server-side only with `logger.warn()`

**Pagination:**

- Always validate: `page: 1-1000, limit: 1-100`
- Use Zod schemas for automatic validation
- Example: `getSummariesSchema`, `getNotesSchema`

**Search Queries:**

- Max 200 characters
- Regex validation: `/^[a-zA-Z0-9\s\-_.,!?'"]*$/`
- Prevents SQL injection and DoS attacks

**Webhook Logging:**

- Log event metadata: `eventId`, `eventType`, `customerId`, `subscriptionId`
- Track processing latency: `startTime` → `endTime`
- Essential for debugging Stripe webhooks

**GDPR Compliance:**

- Delete Stripe customer BEFORE deleting user from database
- Wrap in try-catch to prevent partial deletion
- Export limits: max 100 tokens (reduced from 1000 to prevent DoS)
