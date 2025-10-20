# E2E Tests - Playwright

This directory contains end-to-end tests for the fullstack boilerplate application using Playwright.

## 🎯 Test Coverage

- **Authentication** (`auth.spec.ts`) - 11 tests
  - Login, register, logout flows
  - Protected routes
  - Form validation

- **Subscription** (`subscription.spec.ts`) - 9 tests
  - Pricing plans display
  - Stripe checkout integration
  - Billing portal access
  - Subscription permissions (FREE, PRO, BUSINESS)

- **Password Reset** (`password-reset.spec.ts`) - 12 tests
  - Forgot password flow
  - Token validation
  - Password complexity enforcement
  - Security measures (enumeration prevention, rate limiting)

- **GDPR** (`gdpr.spec.ts`) - 9 tests
  - Data export (JSON download)
  - Account deletion request
  - Privacy rights (view, correct, delete data)

**Total: 41+ tests across 4 test suites**

## 🚀 Running Tests

### Quick Start

```bash
# Run all tests (headless)
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run with visible browser
npm run test:e2e:headed

# View test report
npm run test:e2e:report
```

### Advanced Commands

```bash
# Run specific file
npx playwright test auth.spec.ts

# Run specific test
npx playwright test -g "should login with valid credentials"

# Debug mode
npx playwright test --debug

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## 📁 Project Structure

```
e2e/
├── fixtures/
│   ├── auth.fixture.ts      # Authentication fixtures (authenticated pages)
│   └── test-data.ts          # Centralized test data (users, routes, config)
├── global-setup.ts           # Database seeding before tests
├── auth.spec.ts              # Authentication tests
├── subscription.spec.ts      # Subscription/Stripe tests
├── password-reset.spec.ts    # Password reset tests
├── gdpr.spec.ts              # GDPR compliance tests
└── README.md                 # This file
```

## 🔧 Configuration

Configuration is in `playwright.config.ts` at the root of `apps/frontend/`.

### Key Features:

- **Global Setup**: Seeds test users before tests run
- **Multi-browser**: Tests run on Chromium, Firefox, WebKit (locally)
- **CI Optimized**: Only Chromium in CI for faster feedback
- **Auto Servers**: Automatically starts backend + frontend
- **Timeouts**: 30s in CI, 60s locally
- **Retry**: 1 retry in CI, 0 locally

### Environment Variables

```env
# Backend URL (default: http://localhost:3001)
BACKEND_URL=http://localhost:3001

# Frontend URL (default: http://localhost:3000)
FRONTEND_URL=http://localhost:3000
```

## 🧪 Fixtures

### Authentication Fixtures

Reusable authenticated page contexts to avoid repetitive login code.

```typescript
import { test } from './fixtures/auth.fixture'

test('should access dashboard', async ({ authenticatedPage }) => {
  // User is already logged in
  await authenticatedPage.goto('/dashboard')
})

test('should upgrade as free user', async ({ freeUserPage }) => {
  // Free tier user is logged in
  await freeUserPage.goto('/pricing')
})

test('should access premium features', async ({ proUserPage }) => {
  // PRO tier user is logged in
  await proUserPage.goto('/premium-feature')
})
```

**Available fixtures:**
- `authenticatedPage` - Existing user (test@example.com)
- `freeUserPage` - Free tier user
- `proUserPage` - PRO tier user
- `businessUserPage` - BUSINESS tier user

### Test Data

Centralized test data for consistency across all tests.

```typescript
import { TEST_USERS, TEST_ROUTES, TEST_CONFIG } from './fixtures/test-data'

// Use seeded users
await page.fill('input[type="email"]', TEST_USERS.existing.email)
await page.fill('input[type="password"]', TEST_USERS.existing.password)

// Use centralized routes
await page.goto(TEST_ROUTES.dashboard)

// Use consistent timeouts
await expect(element).toBeVisible({ timeout: TEST_CONFIG.timeouts.medium })
```

## 🌱 Test Data Seeding

Test users are automatically seeded before tests run via `global-setup.ts`.

**Seeded users:**
- `test@example.com` - Existing user (for login tests)
- `freeuser@example.com` - Free tier user
- `prouser@example.com` - PRO tier user
- `businessuser@example.com` - BUSINESS tier user
- `existing@example.com` - Duplicate email (for registration tests)

**Password for all users:** `SecurePassword123!`

## ✅ Best Practices Applied

### 1. **No `waitForTimeout()` Hacks**
❌ Bad:
```typescript
await page.waitForTimeout(1000)
```

✅ Good:
```typescript
await expect(element).toBeVisible({ timeout: 5000 })
```

### 2. **Always Use Assertions**
❌ Bad:
```typescript
await page.click('button')
// No assertion, test always passes
```

✅ Good:
```typescript
await page.click('button')
await expect(page).toHaveURL('/success')
```

### 3. **Centralized Test Data**
❌ Bad:
```typescript
await page.fill('input', 'test@example.com')
```

✅ Good:
```typescript
await page.fill('input', TEST_USERS.existing.email)
```

### 4. **Use Fixtures for Auth**
❌ Bad:
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password')
  await page.click('button[type="submit"]')
})
```

✅ Good:
```typescript
test('my test', async ({ authenticatedPage }) => {
  // Already logged in!
})
```

### 5. **Robust Selectors**
Use this priority:
1. `data-testid` attributes (most reliable)
2. `href` attributes for links
3. Accessible roles (`getByRole`)
4. Text content (least reliable, can change)

### 6. **Document `test.skip()`**
❌ Bad:
```typescript
if (browserName === 'webkit') {
  test.skip()
}
```

✅ Good:
```typescript
test.skip(browserName === 'webkit', 'WebKit redirect bug - see issue #123')
```

## 🔒 Security Tests

### Email Enumeration Prevention
Tests verify that password reset shows same message for existing and non-existing emails:

```typescript
// Both should show generic "check your email" message
await page.fill('input', 'nonexistent@example.com')
await page.click('button[type="submit"]')
const message1 = await page.textContent('.success')

await page.fill('input', 'existing@example.com')
await page.click('button[type="submit"]')
const message2 = await page.textContent('.success')

expect(message1).toBe(message2) // Identical messages
```

### Rate Limiting
Tests verify that excessive requests are blocked:

```typescript
for (let i = 0; i < 6; i++) {
  await page.fill('input', 'test@example.com')
  await page.click('button[type="submit"]')

  if (i >= 4) {
    // Should show rate limit error
    await expect(page.locator('text=/rate limit/i')).toBeVisible()
  }
}
```

## 📊 CI/CD Integration

Tests run automatically in GitHub Actions on:
- Every push to any branch
- Every pull request

### CI Configuration

```yaml
# .github/workflows/ci.yml
- name: Install Playwright
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
```

### CI Optimizations

- **Single browser**: Only Chromium (5-6 min vs 15+ min)
- **Sequential workers**: Avoid race conditions
- **Shorter timeouts**: Faster failure feedback (30s vs 60s)
- **1 retry**: Reduce flakiness impact

## 🐛 Debugging Failed Tests

### 1. Run with UI mode
```bash
npm run test:e2e:ui
```

### 2. Run with headed browser
```bash
npm run test:e2e:headed
```

### 3. Enable debug mode
```bash
npx playwright test --debug
```

### 4. View trace
```bash
npx playwright show-trace trace.zip
```

### 5. Check screenshots
Screenshots are saved in `test-results/` on failure.

## 📈 Test Statistics

| Metric | Value |
|--------|-------|
| Total Tests | 41+ tests |
| Test Files | 4 files |
| Browsers | 3 (Chromium, Firefox, WebKit) |
| CI Runtime | ~5-6 minutes |
| Local Runtime | ~3-4 minutes (parallel) |
| Coverage | 4 critical user flows |

## 🎯 Next Steps

### Recommended Improvements

1. **Add `data-testid` attributes** to critical UI elements
   - Login form inputs: `data-testid="login-email"`
   - Pricing cards: `data-testid="plan-pro"`
   - Action buttons: `data-testid="upgrade-button"`

2. **API helpers** for complex setups
   - Generate valid password reset tokens
   - Create Stripe test subscriptions
   - Seed specific user states

3. **Visual regression testing**
   - Add screenshot comparison tests
   - Use `await expect(page).toHaveScreenshot()`

4. **Performance testing**
   - Measure page load times
   - Test with slow network conditions

5. **Accessibility testing**
   - Use `@axe-core/playwright`
   - Verify WCAG compliance

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [CI Setup](https://playwright.dev/docs/ci)

## 🤝 Contributing

When adding new tests:

1. Use fixtures for authentication
2. Import test data from `fixtures/test-data.ts`
3. Add proper assertions (no empty tests)
4. Avoid `waitForTimeout()` - use explicit waits
5. Document `test.skip()` with issue references
6. Update this README with new test coverage
