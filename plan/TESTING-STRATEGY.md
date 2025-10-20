# NoteFlow - Stratégie de Tests

## Vue d'ensemble

NoteFlow adopte une approche **Test-Driven Development (TDD)** pour garantir la qualité du code et faciliter la maintenance.

**Règle d'or:** Écrire les tests AVANT le code d'implémentation.

---

## 1. Stack de tests (héritée du boilerplate)

### Backend
- **Jest** - Framework de tests
- **Supertest** - Tests API HTTP
- **Prisma Client Mock** - Mock des queries DB
- **BullMQ Mock** - Mock des queues
- **Coverage:** Objectif 80%+

### Frontend
- **Vitest** - Framework de tests (plus rapide que Jest)
- **React Testing Library** - Tests composants
- **MSW (Mock Service Worker)** - Mock API calls
- **Coverage:** Objectif 70%+

### E2E
- **Playwright** - Tests end-to-end
- **Multi-browser:** Chrome, Firefox, Safari

---

## 2. Structure des tests

### Backend
```
apps/backend/src/
├── __tests__/
│   ├── unit/                    # Tests unitaires
│   │   ├── services/
│   │   │   ├── article.service.test.ts
│   │   │   ├── rss.service.test.ts
│   │   │   ├── summary.service.test.ts
│   │   │   ├── ai.service.test.ts
│   │   │   ├── note.service.test.ts
│   │   │   └── post.service.test.ts
│   │   ├── middlewares/
│   │   │   ├── plan-limit.middleware.test.ts
│   │   │   └── auth.middleware.test.ts
│   │   └── utils/
│   │       ├── pdf-parser.test.ts
│   │       └── text-extractor.test.ts
│   │
│   ├── integration/             # Tests d'intégration
│   │   ├── articles.test.ts     # Routes /api/articles
│   │   ├── summaries.test.ts    # Routes /api/summaries
│   │   ├── notes.test.ts        # Routes /api/notes
│   │   ├── posts.test.ts        # Routes /api/posts
│   │   └── stripe.test.ts       # Routes /api/stripe
│   │
│   └── mocks/                   # Mocks réutilisables
│       ├── prisma.mock.ts
│       ├── openai.mock.ts
│       ├── redis.mock.ts
│       └── bullmq.mock.ts
```

### Frontend
```
apps/frontend/
├── __tests__/
│   ├── components/
│   │   ├── veille/
│   │   │   ├── ArticleCard.test.tsx
│   │   │   ├── ArticleList.test.tsx
│   │   │   └── ArticleFilters.test.tsx
│   │   ├── summaries/
│   │   │   ├── SummaryForm.test.tsx
│   │   │   ├── SummaryDisplay.test.tsx
│   │   │   └── StyleSelector.test.tsx
│   │   └── notes/
│   │       ├── NoteEditor.test.tsx
│   │       └── NoteList.test.tsx
│   │
│   ├── hooks/
│   │   ├── useArticles.test.ts
│   │   ├── useSummaries.test.ts
│   │   └── useNotes.test.ts
│   │
│   └── mocks/
│       ├── handlers.ts          # MSW handlers
│       └── data.ts              # Mock data
```

### E2E
```
apps/frontend/e2e/
├── auth.spec.ts                 # Login, register, logout
├── veille.spec.ts               # Veille IA flow
├── summaries.spec.ts            # Create summary flow
├── notes.spec.ts                # CRUD notes
├── posts.spec.ts                # Publish posts
├── plans.spec.ts                # Plan limits & upgrade
└── stripe.spec.ts               # Stripe checkout
```

---

## 3. Workflow TDD (Red-Green-Refactor)

### Exemple: Créer ArticleService

#### Étape 1: RED - Écrire le test (qui échoue)

```typescript
// apps/backend/src/__tests__/unit/services/article.service.test.ts

import { ArticleService } from '../../../services/article.service';
import { prismaMock } from '../../mocks/prisma.mock';

describe('ArticleService', () => {
  let articleService: ArticleService;

  beforeEach(() => {
    articleService = new ArticleService();
  });

  describe('getUserSavedArticles', () => {
    it('should return user saved articles', async () => {
      // Arrange
      const userId = 'user-123';
      const mockArticles = [
        {
          id: 'article-1',
          title: 'Test Article',
          url: 'https://example.com/article-1',
          excerpt: 'Test excerpt',
          source: 'TechCrunch',
          tags: ['ai', 'dev'],
          publishedAt: new Date(),
          createdAt: new Date(),
        },
      ];

      prismaMock.savedArticle.findMany.mockResolvedValue(
        mockArticles.map((article) => ({
          id: 'saved-1',
          userId,
          articleId: article.id,
          article,
          createdAt: new Date(),
        }))
      );

      // Act
      const result = await articleService.getUserSavedArticles(userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Article');
      expect(prismaMock.savedArticle.findMany).toHaveBeenCalledWith({
        where: { userId },
        include: { article: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should apply filters correctly', async () => {
      // Arrange
      const userId = 'user-123';
      const filters = { source: 'TechCrunch', tags: ['ai'] };

      prismaMock.savedArticle.findMany.mockResolvedValue([]);

      // Act
      await articleService.getUserSavedArticles(userId, filters);

      // Assert
      expect(prismaMock.savedArticle.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          article: {
            source: 'TechCrunch',
            tags: { hasSome: ['ai'] },
          },
        },
        include: { article: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('saveArticle', () => {
    it('should save article for user', async () => {
      // Arrange
      const userId = 'user-123';
      const articleId = 'article-1';

      prismaMock.savedArticle.create.mockResolvedValue({
        id: 'saved-1',
        userId,
        articleId,
        createdAt: new Date(),
      });

      // Act
      await articleService.saveArticle(userId, articleId);

      // Assert
      expect(prismaMock.savedArticle.create).toHaveBeenCalledWith({
        data: { userId, articleId },
      });
    });

    it('should throw error if already saved', async () => {
      // Arrange
      const userId = 'user-123';
      const articleId = 'article-1';

      prismaMock.savedArticle.create.mockRejectedValue(
        new Error('Unique constraint violation')
      );

      // Act & Assert
      await expect(
        articleService.saveArticle(userId, articleId)
      ).rejects.toThrow();
    });
  });

  describe('canSaveArticle', () => {
    it('should return true if under limit (FREE plan)', async () => {
      // Arrange
      const userId = 'user-123';

      prismaMock.user.findUnique.mockResolvedValue({
        id: userId,
        plan: 'FREE',
        // ... other fields
      });

      prismaMock.savedArticle.count.mockResolvedValue(5);

      // Act
      const result = await articleService.canSaveArticle(userId);

      // Assert
      expect(result).toBe(true); // FREE limit is 10
    });

    it('should return false if limit reached (FREE plan)', async () => {
      // Arrange
      const userId = 'user-123';

      prismaMock.user.findUnique.mockResolvedValue({
        id: userId,
        plan: 'FREE',
      });

      prismaMock.savedArticle.count.mockResolvedValue(10);

      // Act
      const result = await articleService.canSaveArticle(userId);

      // Assert
      expect(result).toBe(false);
    });

    it('should always return true for PRO plan', async () => {
      // Arrange
      const userId = 'user-123';

      prismaMock.user.findUnique.mockResolvedValue({
        id: userId,
        plan: 'PRO',
      });

      prismaMock.savedArticle.count.mockResolvedValue(9999);

      // Act
      const result = await articleService.canSaveArticle(userId);

      // Assert
      expect(result).toBe(true); // PRO = unlimited
    });
  });
});
```

**Lancer le test:**
```bash
npm test -- article.service.test.ts
```

**Résultat:** ❌ ÉCHEC (le service n'existe pas encore)

---

#### Étape 2: GREEN - Écrire le code minimal pour passer le test

```typescript
// apps/backend/src/services/article.service.ts

import { prisma } from '../config/database';

const PLAN_LIMITS = {
  FREE: { articles: 10 },
  STARTER: { articles: 50 },
  PRO: { articles: Infinity },
};

export class ArticleService {
  async getUserSavedArticles(
    userId: string,
    filters?: { source?: string; tags?: string[] }
  ) {
    const where: any = { userId };

    if (filters?.source || filters?.tags) {
      where.article = {};
      if (filters.source) where.article.source = filters.source;
      if (filters.tags) where.article.tags = { hasSome: filters.tags };
    }

    const savedArticles = await prisma.savedArticle.findMany({
      where,
      include: { article: true },
      orderBy: { createdAt: 'desc' },
    });

    return savedArticles.map((sa) => sa.article);
  }

  async saveArticle(userId: string, articleId: string) {
    await prisma.savedArticle.create({
      data: { userId, articleId },
    });
  }

  async canSaveArticle(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) throw new Error('User not found');

    const limit = PLAN_LIMITS[user.plan].articles;

    if (limit === Infinity) return true;

    const count = await prisma.savedArticle.count({
      where: { userId },
    });

    return count < limit;
  }
}
```

**Lancer le test:**
```bash
npm test -- article.service.test.ts
```

**Résultat:** ✅ SUCCÈS

---

#### Étape 3: REFACTOR - Améliorer le code

```typescript
// apps/backend/src/services/article.service.ts

import { prisma } from '../config/database';
import { Plan } from '@prisma/client';
import { ArticleFilters } from '../types';

const PLAN_LIMITS: Record<Plan, { articles: number }> = {
  FREE: { articles: 10 },
  STARTER: { articles: 50 },
  PRO: { articles: Infinity },
};

export class ArticleService {
  async getUserSavedArticles(userId: string, filters?: ArticleFilters) {
    const savedArticles = await prisma.savedArticle.findMany({
      where: this.buildWhereClause(userId, filters),
      include: { article: true },
      orderBy: { createdAt: 'desc' },
    });

    return savedArticles.map((sa) => sa.article);
  }

  async saveArticle(userId: string, articleId: string): Promise<void> {
    // Check if can save first
    const canSave = await this.canSaveArticle(userId);
    if (!canSave) {
      throw new Error('Plan limit reached');
    }

    await prisma.savedArticle.create({
      data: { userId, articleId },
    });
  }

  async canSaveArticle(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!user) throw new Error('User not found');

    const limit = PLAN_LIMITS[user.plan].articles;

    if (limit === Infinity) return true;

    const count = await prisma.savedArticle.count({
      where: { userId },
    });

    return count < limit;
  }

  private buildWhereClause(userId: string, filters?: ArticleFilters) {
    const where: any = { userId };

    if (filters?.source || filters?.tags) {
      where.article = {};
      if (filters.source) where.article.source = filters.source;
      if (filters.tags) where.article.tags = { hasSome: filters.tags };
    }

    return where;
  }
}
```

**Lancer le test:**
```bash
npm test -- article.service.test.ts
```

**Résultat:** ✅ SUCCÈS (après refactor)

---

## 4. Tests d'intégration (Routes API)

### Exemple: Test routes /api/articles

```typescript
// apps/backend/src/__tests__/integration/articles.test.ts

import { buildApp } from '../../app';
import { FastifyInstance } from 'fastify';
import { prisma } from '../../config/database';
import { generateToken } from '../../utils/jwt';

describe('Articles API', () => {
  let app: FastifyInstance;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Create test user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashed_password',
        plan: 'FREE',
      },
    });
    userId = user.id;
    authToken = generateToken(user);
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  describe('GET /api/articles', () => {
    it('should return articles list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/articles',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveProperty('articles');
      expect(Array.isArray(response.json().articles)).toBe(true);
    });

    it('should filter by source', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/articles?source=TechCrunch',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const { articles } = response.json();
      articles.forEach((article) => {
        expect(article.source).toBe('TechCrunch');
      });
    });

    it('should return 401 if not authenticated', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/articles',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /api/articles/:id/save', () => {
    let articleId: string;

    beforeEach(async () => {
      const article = await prisma.article.create({
        data: {
          title: 'Test Article',
          url: 'https://example.com/test',
          source: 'Test',
          tags: ['test'],
          publishedAt: new Date(),
          feedId: 'feed-1',
        },
      });
      articleId = article.id;
    });

    it('should save article', async () => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/articles/${articleId}/save`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toHaveProperty('message', 'Article saved');
    });

    it('should return 403 if limit reached (FREE plan)', async () => {
      // Save 10 articles (FREE limit)
      for (let i = 0; i < 10; i++) {
        await prisma.savedArticle.create({
          data: {
            userId,
            articleId: `article-${i}`,
          },
        });
      }

      const response = await app.inject({
        method: 'POST',
        url: `/api/articles/${articleId}/save`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      expect(response.json()).toHaveProperty('error', 'Plan limit reached');
    });
  });

  describe('DELETE /api/articles/:id/unsave', () => {
    it('should unsave article', async () => {
      // Save article first
      const saved = await prisma.savedArticle.create({
        data: {
          userId,
          articleId: 'article-1',
        },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/articles/article-1/unsave`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      // Verify deleted
      const deleted = await prisma.savedArticle.findUnique({
        where: { id: saved.id },
      });
      expect(deleted).toBeNull();
    });
  });
});
```

---

## 5. Tests Frontend (Composants React)

### Exemple: Test ArticleCard component

```typescript
// apps/frontend/__tests__/components/veille/ArticleCard.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { ArticleCard } from '@/components/veille/ArticleCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockArticle = {
  id: 'article-1',
  title: 'Test Article',
  url: 'https://example.com/test',
  excerpt: 'This is a test excerpt',
  source: 'TechCrunch',
  tags: ['ai', 'dev'],
  publishedAt: new Date('2025-01-15'),
};

describe('ArticleCard', () => {
  const queryClient = new QueryClient();

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ArticleCard article={mockArticle} {...props} />
      </QueryClientProvider>
    );
  };

  it('should render article information', () => {
    renderComponent();

    expect(screen.getByText('Test Article')).toBeInTheDocument();
    expect(screen.getByText('This is a test excerpt')).toBeInTheDocument();
    expect(screen.getByText('TechCrunch')).toBeInTheDocument();
    expect(screen.getByText('ai')).toBeInTheDocument();
    expect(screen.getByText('dev')).toBeInTheDocument();
  });

  it('should display save button when not saved', () => {
    renderComponent({ isSaved: false });

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeInTheDocument();
  });

  it('should display unsave button when saved', () => {
    renderComponent({ isSaved: true });

    const unsaveButton = screen.getByRole('button', { name: /unsave/i });
    expect(unsaveButton).toBeInTheDocument();
  });

  it('should call onSave when save button clicked', () => {
    const onSave = jest.fn();
    renderComponent({ isSaved: false, onSave });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledWith('article-1');
  });

  it('should open article in new tab when clicking title', () => {
    renderComponent();

    const link = screen.getByRole('link', { name: /test article/i });
    expect(link).toHaveAttribute('href', 'https://example.com/test');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
```

---

## 6. Tests E2E (Playwright)

### Exemple: Test flow création résumé

```typescript
// apps/frontend/e2e/summaries.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Summaries Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should create summary from text', async ({ page }) => {
    // Navigate to summaries page
    await page.goto('http://localhost:3000/summaries');

    // Select text source
    await page.click('button:has-text("Text")');

    // Enter text
    const testText = 'This is a long article about AI and machine learning...';
    await page.fill('textarea[name="text"]', testText);

    // Select style
    await page.click('button:has-text("Short")');

    // Submit
    await page.click('button:has-text("Generate Summary")');

    // Wait for summary to be generated
    await expect(page.locator('text=Summary generated')).toBeVisible({
      timeout: 30000,
    });

    // Verify summary is displayed
    await expect(page.locator('[data-testid="summary-text"]')).toBeVisible();
  });

  test('should create summary from PDF', async ({ page }) => {
    await page.goto('http://localhost:3000/summaries');

    // Select PDF source
    await page.click('button:has-text("PDF")');

    // Upload PDF
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/test-document.pdf');

    // Select style
    await page.click('button:has-text("Bullet Points")');

    // Submit
    await page.click('button:has-text("Generate Summary")');

    // Wait for processing
    await expect(page.locator('text=Processing PDF...')).toBeVisible();
    await expect(page.locator('text=Summary generated')).toBeVisible({
      timeout: 30000,
    });
  });

  test('should respect plan limits (FREE)', async ({ page }) => {
    // Create 5 summaries (FREE limit)
    for (let i = 0; i < 5; i++) {
      await page.goto('http://localhost:3000/summaries');
      await page.fill('textarea[name="text"]', `Test text ${i}`);
      await page.click('button:has-text("Generate Summary")');
      await page.waitForSelector('text=Summary generated');
    }

    // Try to create 6th summary
    await page.goto('http://localhost:3000/summaries');
    await page.fill('textarea[name="text"]', 'Test text 6');
    await page.click('button:has-text("Generate Summary")');

    // Should show limit error
    await expect(page.locator('text=Plan limit reached')).toBeVisible();
    await expect(page.locator('text=Upgrade to STARTER')).toBeVisible();
  });

  test('should show summary history', async ({ page }) => {
    await page.goto('http://localhost:3000/summaries');

    // Create a summary first
    await page.fill('textarea[name="text"]', 'Test history');
    await page.click('button:has-text("Generate Summary")');
    await page.waitForSelector('text=Summary generated');

    // Check history section
    await expect(page.locator('[data-testid="summary-history"]')).toBeVisible();
    await expect(page.locator('text=Test history')).toBeVisible();
  });
});
```

---

## 7. Ordre d'implémentation avec TDD

### Sprint 1.2: Veille IA - Backend (avec TDD)

**Jour 1: Services**
1. Écrire tests `rss.service.test.ts` → Implémenter `RSSService`
2. Écrire tests `article.service.test.ts` → Implémenter `ArticleService`

**Jour 2: Middlewares & Routes**
3. Écrire tests `plan-limit.middleware.test.ts` → Implémenter middleware
4. Écrire tests integration `articles.test.ts` → Implémenter routes

**Jour 3: Queue & Worker**
5. Écrire tests `rss.queue.test.ts` → Implémenter queue
6. Écrire tests `rss.worker.test.ts` → Implémenter worker

**Jour 4: Seed & Validation**
7. Seed 3-5 flux RSS
8. Tests manuels
9. Fix bugs

**Jour 5: Review & Documentation**
10. Code review
11. Documentation API

---

## 8. Commandes de test

### Backend
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- article.service.test.ts

# Run in watch mode
npm run test:watch
```

### Frontend
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test
npm test -- ArticleCard.test.tsx
```

### E2E
```bash
# Run all E2E tests
npm run test:e2e

# Run specific spec
npm run test:e2e -- summaries.spec.ts

# Run with UI
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

---

## 9. Coverage minimale requise

### Par sprint
- **Services:** 90%+ coverage
- **Middlewares:** 85%+ coverage
- **Routes (integration):** 80%+ coverage
- **Components:** 70%+ coverage
- **Hooks:** 80%+ coverage

### Avant merge PR
- Aucune régression de coverage
- Toutes les nouvelles fonctionnalités doivent avoir des tests
- CI doit être vert (tous les tests passent)

---

## 10. Bonnes pratiques

### 1. AAA Pattern (Arrange-Act-Assert)
```typescript
it('should do something', () => {
  // Arrange: Setup
  const input = 'test';

  // Act: Execute
  const result = myFunction(input);

  // Assert: Verify
  expect(result).toBe('expected');
});
```

### 2. Nommage descriptif
```typescript
// ❌ Bad
it('test 1', () => {});

// ✅ Good
it('should return error when user is not found', () => {});
```

### 3. Un test = un concept
```typescript
// ❌ Bad: teste plusieurs choses
it('should save and delete article', () => {});

// ✅ Good: tests séparés
it('should save article', () => {});
it('should delete article', () => {});
```

### 4. Mock les dépendances externes
```typescript
// ❌ Bad: appel OpenAI réel
const summary = await openai.createCompletion(...);

// ✅ Good: mock OpenAI
jest.mock('openai');
openai.createCompletion.mockResolvedValue({ text: 'Summary' });
```

### 5. Cleanup après tests
```typescript
afterEach(async () => {
  await prisma.savedArticle.deleteMany();
  jest.clearAllMocks();
});
```

---

## 11. CI/CD avec tests

### GitHub Actions (déjà dans boilerplate)

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage

  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

---

## 12. Checklist avant commit

- [ ] Tous les tests passent localement
- [ ] Coverage >= seuil minimum
- [ ] Pas de `console.log` oubliés
- [ ] Pas de tests skip (`it.skip`, `test.skip`)
- [ ] Pas de code commenté
- [ ] Documentation à jour

---

**Document créé:** 2025-10-20
**Dernière mise à jour:** 2025-10-20
**Version:** 1.0

**Résumé:** Écrire les tests AVANT le code, viser 80%+ coverage, utiliser TDD (Red-Green-Refactor)
