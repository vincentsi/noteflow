# Middleware Execution Order

This document explains the order in which middlewares are executed in the Fastify application and why this order is critical for security and functionality.

## Overview

Middlewares in Fastify execute in the order they are registered. The order matters because:
- Security headers must be set before any response
- Authentication must happen before authorization
- Rate limiting should happen early to prevent abuse
- Error handling must be last to catch all errors

## Execution Order

### 1. **Request Lifecycle Hooks** (`onRequest`)

Executed for every incoming request, in order:

#### a. Security Headers (`securityHeadersMiddleware`)
```typescript
app.addHook('onRequest', securityHeadersMiddleware)
```
**Purpose:** Add HTTP security headers (HSTS, X-Frame-Options, etc.)
**Why first:** Headers must be set before any processing
**Location:** `middlewares/security-headers.middleware.ts`

#### b. Content Security Policy (`contentSecurityPolicyMiddleware`)
```typescript
app.addHook('onRequest', contentSecurityPolicyMiddleware)
```
**Purpose:** Set CSP headers to prevent XSS attacks
**Why early:** Security headers should be set ASAP
**Location:** `middlewares/security-headers.middleware.ts`

#### c. Correlation ID (`correlationIdMiddleware`)
```typescript
app.addHook('onRequest', correlationIdMiddleware)
```
**Purpose:** Generate unique ID for distributed tracing
**Why early:** Used for logging throughout request lifecycle
**Location:** `middlewares/correlation-id.middleware.ts`

#### d. API Versioning (`apiVersionMiddleware`)
```typescript
app.addHook('onRequest', apiVersionMiddleware)
```
**Purpose:** Add API version headers to responses
**Why early:** Informational headers
**Location:** `middlewares/api-version.middleware.ts`

#### e. Metrics Collection (`metricsMiddleware`)
```typescript
app.addHook('onRequest', metricsMiddleware)
```
**Purpose:** Track HTTP request metrics (Prometheus)
**Why early:** Should capture all requests
**Location:** `middlewares/metrics.middleware.ts`

### 2. **Pre-Handler Hooks** (`preHandler`)

Executed after request parsing but before route handler:

#### a. CSRF Protection (`csrfMiddleware`)
```typescript
app.addHook('preHandler', csrfMiddleware)
```
**Purpose:** Validate CSRF tokens on state-changing operations
**Why here:** Needs parsed body/cookies, before handler
**Location:** `middlewares/csrf.middleware.ts`
**Exemptions:** GET, HEAD, OPTIONS, webhook endpoints

### 3. **Route-Level Middlewares** (`preHandler`)

Executed only for specific routes:

#### a. Authentication (`authMiddleware`)
```typescript
fastify.get('/api/protected', {
  preHandler: [authMiddleware],
  handler: protectedHandler
})
```
**Purpose:** Validate JWT and populate `request.user`
**Why route-level:** Not all routes need auth
**Location:** `middlewares/auth.middleware.ts`

#### b. Authorization (`rbacMiddleware`)
```typescript
fastify.get('/api/admin', {
  preHandler: [authMiddleware, rbacMiddleware(['ADMIN'])],
  handler: adminHandler
})
```
**Purpose:** Check user role/permissions
**Why after auth:** Needs `request.user` populated
**Location:** `middlewares/rbac.middleware.ts`

#### c. Subscription Check (`subscriptionMiddleware`)
```typescript
fastify.post('/api/premium-feature', {
  preHandler: [authMiddleware, subscriptionMiddleware],
  handler: premiumHandler
})
```
**Purpose:** Verify user has active subscription
**Why after auth:** Needs `request.user`
**Location:** `middlewares/subscription.middleware.ts`

#### d. Tier-Based Rate Limiting (`createTierRateLimit`)
```typescript
fastify.post('/api/summaries', {
  preHandler: [authMiddleware, createTierRateLimit('summary', TIER_LIMITS.SUMMARY)],
  handler: summaryHandler
})
```
**Purpose:** Apply different rate limits based on user tier
**Why after auth:** Needs `request.user.planType`
**Location:** `middlewares/tier-rate-limit.middleware.ts`

### 4. **Response Hooks** (`onResponse`)

Executed after response is sent:

#### a. Metrics Response Hook (`metricsResponseHook`)
```typescript
app.addHook('onResponse', metricsResponseHook)
```
**Purpose:** Record response metrics (duration, status code)
**Why last:** Needs final response data
**Location:** `middlewares/metrics.middleware.ts`

### 5. **Error Handler**

Executed when any error is thrown:

```typescript
app.setErrorHandler(errorHandler)
```
**Purpose:** Centralized error handling and formatting
**Why last:** Must catch all errors from middlewares/handlers
**Location:** `middlewares/error-handler.middleware.ts`

## Middleware Chain Examples

### Example 1: Public Endpoint (No Auth)
```
GET /api/health
↓
1. securityHeadersMiddleware (add security headers)
2. contentSecurityPolicyMiddleware (add CSP)
3. correlationIdMiddleware (generate request ID)
4. apiVersionMiddleware (add version header)
5. metricsMiddleware (start timer)
6. csrfMiddleware (skip - GET request)
7. healthHandler (execute route handler)
8. metricsResponseHook (record metrics)
→ Response sent
```

### Example 2: Protected Endpoint
```
GET /api/notes
↓
1. securityHeadersMiddleware
2. contentSecurityPolicyMiddleware
3. correlationIdMiddleware
4. apiVersionMiddleware
5. metricsMiddleware
6. csrfMiddleware (skip - GET request)
7. authMiddleware (validate JWT, populate request.user)
8. notesHandler (execute route handler)
9. metricsResponseHook
→ Response sent
```

### Example 3: Premium Feature with Rate Limiting
```
POST /api/summaries
↓
1. securityHeadersMiddleware
2. contentSecurityPolicyMiddleware
3. correlationIdMiddleware
4. apiVersionMiddleware
5. metricsMiddleware
6. csrfMiddleware (validate CSRF token)
7. authMiddleware (validate JWT)
8. createTierRateLimit (check rate limit based on planType)
9. subscriptionMiddleware (verify active subscription)
10. summaryHandler (execute route handler)
11. metricsResponseHook
→ Response sent
```

### Example 4: Error Case
```
POST /api/admin/users
↓
1. securityHeadersMiddleware
2. contentSecurityPolicyMiddleware
3. correlationIdMiddleware
4. apiVersionMiddleware
5. metricsMiddleware
6. csrfMiddleware (validate CSRF token)
7. authMiddleware (validate JWT)
8. rbacMiddleware(['ADMIN']) → Throws ForbiddenError
↓
ERROR HANDLER
↓
errorHandler (catch error, format response, log)
→ Response sent (403 Forbidden)
```

## Security Plugins (from security.middleware.ts)

These are registered via `@fastify/` plugins and execute before custom middlewares:

1. **Helmet** - Additional security headers
2. **CORS** - Cross-origin resource sharing
3. **Rate Limiting** - Global rate limiting (100 req/min)

## Important Notes

### ⚠️ Order is Critical

Changing the order can break functionality or create security vulnerabilities:

```typescript
// ❌ WRONG: Auth before CSRF
app.addHook('preHandler', authMiddleware)
app.addHook('preHandler', csrfMiddleware)
// Problem: Authenticated requests can bypass CSRF protection

// ✅ CORRECT: CSRF before auth
app.addHook('preHandler', csrfMiddleware)
// Auth is route-level, applied after CSRF
```

### 🔒 Security Best Practices

1. **Always set security headers first** - Protect all responses
2. **CSRF before authentication** - Validate token before processing auth
3. **Rate limiting early** - Prevent abuse before expensive operations
4. **Authentication before authorization** - Must know who before checking permissions
5. **Subscription check after auth** - Needs user context

### 📊 Performance Considerations

1. **Cheap operations first** - Headers, correlation ID
2. **Expensive operations last** - Database queries (auth, subscription)
3. **Fail fast** - Rate limiting before DB operations

### 🧪 Testing

When testing routes, remember to mock middlewares in order:

```typescript
// Mock the middleware chain
beforeEach(() => {
  app.addHook('onRequest', mockSecurityHeaders)
  app.addHook('preHandler', mockAuth)
  app.addHook('preHandler', mockRBAC)
})
```

## Diagram

```
                    Request
                       ↓
         ┌─────────────────────────┐
         │   Security Headers      │ ← Always first
         └─────────────────────────┘
                       ↓
         ┌─────────────────────────┐
         │   CSP Headers           │
         └─────────────────────────┘
                       ↓
         ┌─────────────────────────┐
         │   Correlation ID        │
         └─────────────────────────┘
                       ↓
         ┌─────────────────────────┐
         │   CSRF Protection       │ ← Before auth
         └─────────────────────────┘
                       ↓
         ┌─────────────────────────┐
         │   Authentication        │ ← Route-specific
         └─────────────────────────┘
                       ↓
         ┌─────────────────────────┐
         │   Authorization (RBAC)  │ ← After auth
         └─────────────────────────┘
                       ↓
         ┌─────────────────────────┐
         │   Subscription Check    │ ← After auth
         └─────────────────────────┘
                       ↓
         ┌─────────────────────────┐
         │   Route Handler         │
         └─────────────────────────┘
                       ↓
                   Response
                       ↓
         ┌─────────────────────────┐
         │   Metrics Recording     │ ← After response
         └─────────────────────────┘
```

## References

- Fastify Lifecycle: https://fastify.dev/docs/latest/Reference/Lifecycle/
- Middleware Best Practices: https://fastify.dev/docs/latest/Reference/Hooks/
- Security Headers: https://owasp.org/www-project-secure-headers/
