# data-testid Implementation Guide

## 🎯 Why data-testid?

Using `data-testid` attributes makes your E2E tests:
- **More reliable**: Tests survive UI text changes
- **Faster to write**: Clear, semantic selectors
- **Easier to maintain**: No brittle CSS selectors
- **Self-documenting**: Shows which elements are tested

## 📋 Recommended data-testid Attributes

### Authentication Pages

#### Login Page (`app/(auth)/login/page.tsx`)
```tsx
<Input
  data-testid="login-email"
  type="email"
  name="email"
  placeholder="Email"
/>

<Input
  data-testid="login-password"
  type="password"
  name="password"
  placeholder="Password"
/>

<Button
  data-testid="login-submit"
  type="submit"
>
  Log in
</Button>

<Link
  data-testid="forgot-password-link"
  href="/forgot-password"
>
  Forgot password?
</Link>
```

#### Register Page (`app/(auth)/register/page.tsx`)
```tsx
<Input
  data-testid="register-name"
  type="text"
  name="name"
  placeholder="Name"
/>

<Input
  data-testid="register-email"
  type="email"
  name="email"
  placeholder="Email"
/>

<Input
  data-testid="register-password"
  type="password"
  name="password"
  placeholder="Password"
/>

<Button
  data-testid="register-submit"
  type="submit"
>
  Create account
</Button>
```

#### Forgot Password Page (`app/(auth)/forgot-password/page.tsx`)
```tsx
<Input
  data-testid="forgot-password-email"
  type="email"
  name="email"
  placeholder="Email"
/>

<Button
  data-testid="forgot-password-submit"
  type="submit"
>
  Send reset link
</Button>

<div data-testid="forgot-password-success-message">
  Check your email for a reset link
</div>
```

#### Reset Password Page (`app/(auth)/reset-password/page.tsx`)
```tsx
<Input
  data-testid="reset-password-new-password"
  type="password"
  name="password"
  placeholder="New password"
/>

<Input
  data-testid="reset-password-confirm"
  type="password"
  name="confirmPassword"
  placeholder="Confirm password"
/>

<Button
  data-testid="reset-password-submit"
  type="submit"
>
  Reset password
</Button>
```

---

### Dashboard & Navigation

#### Dashboard Layout (`app/(dashboard)/layout.tsx` or navigation component)
```tsx
<Button
  data-testid="logout-button"
  onClick={handleLogout}
>
  Logout
</Button>

<Link
  data-testid="nav-dashboard"
  href="/dashboard"
>
  Dashboard
</Link>

<Link
  data-testid="nav-profile"
  href="/profile"
>
  Profile
</Link>

<Link
  data-testid="nav-pricing"
  href="/pricing"
>
  Pricing
</Link>

<Link
  data-testid="nav-settings"
  href="/settings"
>
  Settings
</Link>
```

#### Dashboard Page (`app/(dashboard)/dashboard/page.tsx`)
```tsx
<div data-testid="dashboard-container">
  <h1>Dashboard</h1>

  <Card data-testid="subscription-card">
    <p data-testid="current-plan">
      Plan: {user.planType}
    </p>
  </Card>
</div>
```

---

### Pricing & Subscription

#### Pricing Page (`app/pricing/page.tsx` or pricing component)
```tsx
<Card data-testid="plan-free">
  <h3>FREE</h3>
  <p>$0/month</p>
  <Button data-testid="plan-free-button">
    Current Plan
  </Button>
</Card>

<Card data-testid="plan-pro">
  <h3>PRO</h3>
  <p>$15/month</p>
  <Button data-testid="plan-pro-button">
    Upgrade to PRO
  </Button>
</Card>

<Card data-testid="plan-business">
  <h3>BUSINESS</h3>
  <p>$50/month</p>
  <Button data-testid="plan-business-button">
    Upgrade to BUSINESS
  </Button>
</Card>
```

#### Billing Portal Link
```tsx
<Button
  data-testid="manage-subscription-button"
  onClick={handleManageSubscription}
>
  Manage Subscription
</Button>
```

---

### GDPR & Privacy

#### GDPR Settings Page (`app/settings/gdpr/page.tsx`)
```tsx
<div data-testid="gdpr-container">
  <h1>Privacy & GDPR</h1>

  <section data-testid="gdpr-export-section">
    <h2>Export Your Data</h2>
    <p>Download all your data in JSON format</p>
    <Button data-testid="export-data-button">
      Export Data
    </Button>
  </section>

  <section data-testid="gdpr-delete-section">
    <h2>Delete Account</h2>
    <p data-testid="delete-warning">
      This action is permanent and cannot be undone
    </p>
    <Button data-testid="delete-account-button">
      Delete Account
    </Button>
  </section>
</div>

{/* Confirmation dialog */}
<Dialog data-testid="delete-confirmation-dialog">
  <h3>Are you sure?</h3>
  <p>This action cannot be undone</p>
  <Button data-testid="delete-confirm-button">
    Yes, delete my account
  </Button>
  <Button data-testid="delete-cancel-button">
    Cancel
  </Button>
</Dialog>
```

---

### Profile

#### Profile Page (`app/profile/page.tsx`)
```tsx
<form data-testid="profile-form">
  <Input
    data-testid="profile-name"
    type="text"
    name="name"
    defaultValue={user.name}
  />

  <Input
    data-testid="profile-email"
    type="email"
    name="email"
    defaultValue={user.email}
  />

  <Button
    data-testid="profile-save-button"
    type="submit"
  >
    Save Changes
  </Button>
</form>
```

---

### Error Messages & Notifications

#### Form Validation Errors
```tsx
<span
  data-testid="error-message-email"
  className="text-red-500"
>
  Please enter a valid email
</span>

<span
  data-testid="error-message-password"
  className="text-red-500"
>
  Password must be at least 12 characters
</span>
```

#### Success Messages
```tsx
<div
  data-testid="success-message"
  className="bg-green-100 text-green-800"
>
  Changes saved successfully!
</div>
```

#### API Error Messages
```tsx
<div
  data-testid="api-error-message"
  className="bg-red-100 text-red-800"
>
  {error.message}
</div>
```

---

## 🔧 Usage in Tests

Once you've added `data-testid` attributes, your tests become much cleaner:

### Before (Fragile)
```typescript
// ❌ Fragile selector
await page.fill('input[name="email"], input[type="email"]', 'test@example.com')

// ❌ Text-based selector (breaks if text changes)
await page.click('button:has-text("Log in")')
```

### After (Robust)
```typescript
// ✅ Clean, semantic selector
await page.fill('[data-testid="login-email"]', 'test@example.com')

// ✅ Survives text changes
await page.click('[data-testid="login-submit"]')
```

### Playwright Helpers
```typescript
// Using getByTestId (recommended)
await page.getByTestId('login-email').fill('test@example.com')
await page.getByTestId('login-submit').click()

// Verify elements
await expect(page.getByTestId('success-message')).toBeVisible()
await expect(page.getByTestId('error-message-email')).toHaveText(/valid email/i)
```

---

## 📦 Implementation Checklist

### Phase 1: Critical Paths (Priority 1)
- [ ] Login form (`login-email`, `login-password`, `login-submit`)
- [ ] Register form (`register-name`, `register-email`, `register-password`, `register-submit`)
- [ ] Logout button (`logout-button`)
- [ ] Navigation links (`nav-dashboard`, `nav-profile`, etc.)

### Phase 2: Subscription Flow (Priority 2)
- [ ] Pricing cards (`plan-free`, `plan-pro`, `plan-business`)
- [ ] Upgrade buttons (`plan-pro-button`, `plan-business-button`)
- [ ] Manage subscription button (`manage-subscription-button`)
- [ ] Current plan display (`current-plan`)

### Phase 3: GDPR & Settings (Priority 3)
- [ ] Export data button (`export-data-button`)
- [ ] Delete account button (`delete-account-button`)
- [ ] Confirmation dialogs (`delete-confirmation-dialog`, `delete-confirm-button`)
- [ ] Profile form (`profile-form`, `profile-name`, `profile-email`)

### Phase 4: Password Reset (Priority 4)
- [ ] Forgot password form (`forgot-password-email`, `forgot-password-submit`)
- [ ] Reset password form (`reset-password-new-password`, `reset-password-submit`)
- [ ] Success messages (`forgot-password-success-message`)

---

## 🎨 Naming Conventions

### Pattern: `{page}-{element}-{type}`

**Examples:**
- `login-email` (login page, email input)
- `register-submit` (register page, submit button)
- `profile-save-button` (profile page, save button)
- `plan-pro-button` (pricing page, PRO plan button)

### Common Suffixes
- `-button` for buttons
- `-link` for links
- `-form` for forms
- `-container` for wrappers
- `-card` for card components
- `-dialog` for modals/dialogs
- `-message` for notifications

### Avoid
- ❌ Generic names: `button1`, `div2`
- ❌ Implementation details: `submit-btn-primary-blue`
- ❌ Overly long: `registration-form-email-input-field-with-validation`

### Prefer
- ✅ Semantic: `register-email`
- ✅ Descriptive: `delete-confirm-button`
- ✅ Consistent: `plan-free`, `plan-pro`, `plan-business`

---

## 🚀 Migration Strategy

### Step 1: Add to New Components
All new components should include `data-testid` from the start.

### Step 2: Update Critical Paths
Start with authentication and subscription flows (highest priority).

### Step 3: Update Tests Gradually
Update tests file by file to use new `data-testid` selectors:

```typescript
// Before
await page.fill('input[name="email"]', 'test@example.com')

// After
await page.getByTestId('login-email').fill('test@example.com')
```

### Step 4: Document as You Go
Add comments in components to explain why certain elements have `data-testid`.

---

## 📊 Benefits Summary

| Aspect | Without data-testid | With data-testid |
|--------|---------------------|------------------|
| **Reliability** | Tests break on text/style changes | Tests survive refactoring |
| **Speed** | Slow, complex selectors | Fast, direct selectors |
| **Readability** | `input[name="email"]` | `getByTestId('login-email')` |
| **Maintainability** | Hard to find what's tested | Easy to see test coverage |
| **Internationalization** | Breaks with translations | Works in all languages |

---

## 🎯 Example: Complete Login Form

```tsx
// app/(auth)/login/page.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  return (
    <form data-testid="login-form">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          name="email"
          data-testid="login-email"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          name="password"
          data-testid="login-password"
          placeholder="••••••••"
        />
      </div>

      <Button
        type="submit"
        data-testid="login-submit"
      >
        Log in
      </Button>

      <Link
        href="/forgot-password"
        data-testid="forgot-password-link"
      >
        Forgot password?
      </Link>
    </form>
  )
}
```

**Corresponding Test:**
```typescript
test('should login successfully', async ({ page }) => {
  await page.goto('/login')

  await page.getByTestId('login-email').fill(TEST_USERS.existing.email)
  await page.getByTestId('login-password').fill(TEST_USERS.existing.password)
  await page.getByTestId('login-submit').click()

  await expect(page).toHaveURL('/dashboard')
  await expect(page.getByTestId('logout-button')).toBeVisible()
})
```

Clean, readable, and reliable! ✨
