# NoteFlow - Workflow TDD Feature par Feature

## Principe

Pour chaque feature, on suit ce cycle:

```
1. Écrire le TEST (qui échoue) ❌
2. Implémenter la FEATURE (test passe) ✅
3. REFACTOR si nécessaire ♻️
4. Commit ✅
5. Passer à la feature suivante
```

**Règle:** On ne passe JAMAIS à la feature suivante tant que les tests de la feature actuelle ne passent pas.

---

## Sprint 0: Setup (Semaine 1)

### Feature 0.1: Setup projet de base ✅

**Pas de test** (setup infrastructure)

- [x] Nettoyer boilerplate (supprimer exemples)
- [x] Renommer → NoteFlow
- [x] Setup env variables
- [x] Vérifier build
- [x] Commit: "chore: initial project setup"

---

### Feature 0.2: Prisma Schema - User & Auth ✅

**Test:** Schema validation

```bash
# Test: Prisma generate doit fonctionner
npx prisma generate
npx prisma validate
```

**Implémentation:**

- [x] Créer/adapter User model avec champ `language` et `plan`
- [x] Enum `Plan` (FREE, STARTER, PRO)
- [x] Enum `Role` (USER, ADMIN)
- [x] Migration: `npx prisma migrate dev --name add-user-plan`
- [x] Commit: "feat: add user schema with plans"

### Feature 0.3: i18n Setup ⏭️ SKIPPED

**Raison:** Sera implémenté plus tard selon besoin

**Test:** i18n config works

```typescript
// apps/frontend/__tests__/i18n.test.ts
import { i18n } from '@/lib/i18n/config'

describe('i18n Configuration', () => {
  it('should have French translations', () => {
    expect(i18n.hasResourceBundle('fr', 'translation')).toBe(true)
  })

  it('should have English translations', () => {
    expect(i18n.hasResourceBundle('en', 'translation')).toBe(true)
  })

  it('should translate nav.dashboard in French', () => {
    i18n.changeLanguage('fr')
    expect(i18n.t('nav.dashboard')).toBe('Tableau de bord')
  })

  it('should translate nav.dashboard in English', () => {
    i18n.changeLanguage('en')
    expect(i18n.t('nav.dashboard')).toBe('Dashboard')
  })
})
```

**Implémentation:**

- [ ] Install `next-i18next`
- [ ] Create `lib/i18n/config.ts`
- [ ] Create `lib/i18n/fr.json`
- [ ] Create `lib/i18n/en.json`
- [ ] Run test: `npm test -- i18n.test.ts`
- [ ] Commit: "feat: add i18n support (FR/EN)"

---

### Feature 0.4: Stripe Plans Configuration ⏭️ SKIPPED

**Raison:** Nécessite accès Stripe Dashboard - à faire manuellement

**Test:** Stripe products exist

```typescript
// apps/backend/src/__tests__/integration/stripe-setup.test.ts
import Stripe from 'stripe'

describe('Stripe Setup', () => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  it('should have STARTER product (6€)', async () => {
    const products = await stripe.products.list()
    const starter = products.data.find(p => p.name === 'STARTER')

    expect(starter).toBeDefined()

    const prices = await stripe.prices.list({ product: starter!.id })
    expect(prices.data[0].unit_amount).toBe(600) // 6€ in cents
  })

  it('should have PRO product (15€)', async () => {
    const products = await stripe.products.list()
    const pro = products.data.find(p => p.name === 'PRO')

    expect(pro).toBeDefined()

    const prices = await stripe.prices.list({ product: pro!.id })
    expect(prices.data[0].unit_amount).toBe(1500) // 15€ in cents
  })
})
```

**Implémentation:**

- [ ] Create Stripe products via Dashboard (STARTER 6€, PRO 15€)
- [ ] Add price IDs to `.env`
- [ ] Run test: `npm test -- stripe-setup.test.ts`
- [ ] Commit: "feat: configure Stripe products (STARTER/PRO)"

---

## Sprint 1.1: Auth & User Management

### Feature 1.1.1: Auth adaptation (déjà dans boilerplate) ✅

**Test:** Auth endpoints work

```typescript
// apps/backend/src/__tests__/integration/auth.test.ts (déjà existant)
describe('Auth API', () => {
  it('POST /api/auth/register - should create user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json()).toHaveProperty('accessToken')
  })

  // ... autres tests auth
})
```

**Implémentation:**

- [x] Vérifier que les tests auth du boilerplate passent
- [x] Run: `npm test -- auth.test.ts`
- [x] Commit: "test: verify auth tests passing"

---

### Feature 1.1.2: Update profile endpoint ✅

**Test:** User can update profile

```typescript
// apps/backend/src/__tests__/integration/user.test.ts
describe('User API', () => {
  describe('PATCH /api/users/me', () => {
    it('should update user language', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/users/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          language: 'en',
        },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().language).toBe('en')
    })

    it('should update user name', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/users/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: {
          name: 'New Name',
        },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().name).toBe('New Name')
    })

    it('should return 401 if not authenticated', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/users/me',
        payload: { name: 'Test' },
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
```

**Implémentation:**

- [x] Create route `PATCH /api/users/me`
- [x] Create user.routes.ts with inline handler
- [x] Update user name and language in DB
- [x] Run test: `npm test -- user.test.ts` (6/6 passing)
- [x] Commit: "feat: add update user profile endpoint"

---

### Feature 1.1.3: Settings page (Frontend) ✅

**Test:** Settings page renders

```typescript
// apps/frontend/__tests__/pages/settings.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SettingsPage from '@/app/(dashboard)/settings/page';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('Settings Page', () => {
  const queryClient = new QueryClient();

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SettingsPage />
      </QueryClientProvider>
    );
  };

  it('should render language selector', () => {
    renderPage();

    expect(screen.getByLabelText(/language/i)).toBeInTheDocument();
  });

  it('should render current plan', () => {
    renderPage();

    expect(screen.getByText(/current plan/i)).toBeInTheDocument();
  });

  it('should update language when changed', async () => {
    renderPage();

    const select = screen.getByLabelText(/language/i);
    fireEvent.change(select, { target: { value: 'en' } });

    await waitFor(() => {
      expect(screen.getByText(/language updated/i)).toBeInTheDocument();
    });
  });
});
```

**Implémentation:**

- [x] Create page `app/(dashboard)/settings/page.tsx`
- [x] Create Select UI component (shadcn/ui)
- [x] Add language selector with fr/en options
- [x] Update User type with language and subscriptionStatus fields
- [x] Update User type: BUSINESS → STARTER
- [x] Display current plan in Settings page
- [x] Build succeeds (frontend type-check ✓)
- [x] Commit: "feat: add settings page with language selector"

---

## Sprint 1.2: Veille IA - Backend

### Feature 1.2.1: Prisma Models (Article, RSSFeed, SavedArticle)

**Test:** Schema validation

```bash
npx prisma generate
npx prisma validate
```

**Implémentation:**

- [ ] Add `RSSFeed` model
- [ ] Add `Article` model
- [ ] Add `SavedArticle` model
- [ ] Migration: `npx prisma migrate dev --name add-veille-models`
- [ ] Commit: "feat: add veille IA database models"

---

### Feature 1.2.2: RSSService.parseFeed()

**Test:** Parse RSS feed

```typescript
// apps/backend/src/__tests__/unit/services/rss.service.test.ts
import { RSSService } from '@/services/rss.service'

describe('RSSService', () => {
  let rssService: RSSService

  beforeEach(() => {
    rssService = new RSSService()
  })

  describe('parseFeed', () => {
    it('should parse valid RSS feed', async () => {
      const url = 'https://hnrss.org/newest'
      const articles = await rssService.parseFeed(url)

      expect(articles).toBeDefined()
      expect(Array.isArray(articles)).toBe(true)
      expect(articles.length).toBeGreaterThan(0)
      expect(articles[0]).toHaveProperty('title')
      expect(articles[0]).toHaveProperty('url')
      expect(articles[0]).toHaveProperty('publishedAt')
    })

    it('should throw error for invalid URL', async () => {
      await expect(rssService.parseFeed('invalid-url')).rejects.toThrow()
    })

    it('should clean HTML from excerpt', async () => {
      const url = 'https://hnrss.org/newest'
      const articles = await rssService.parseFeed(url)

      const article = articles[0]
      expect(article.excerpt).not.toContain('<')
      expect(article.excerpt).not.toContain('>')
    })
  })
})
```

**Implémentation:**

- [ ] Create `services/rss.service.ts`
- [ ] Install `rss-parser`
- [ ] Implement `parseFeed(url)`
- [ ] Clean HTML from excerpts
- [ ] Run test: `npm test -- rss.service.test.ts`
- [ ] Commit: "feat: add RSS parsing service"

---

### Feature 1.2.3: ArticleService.getUserSavedArticles()

**Test:** Get user saved articles

```typescript
// apps/backend/src/__tests__/unit/services/article.service.test.ts
import { ArticleService } from '@/services/article.service'
import { prismaMock } from '../../mocks/prisma.mock'

describe('ArticleService', () => {
  let articleService: ArticleService

  beforeEach(() => {
    articleService = new ArticleService()
  })

  describe('getUserSavedArticles', () => {
    it('should return user saved articles', async () => {
      const userId = 'user-123'
      const mockArticles = [
        {
          id: 'saved-1',
          userId,
          articleId: 'article-1',
          article: {
            id: 'article-1',
            title: 'Test Article',
            url: 'https://example.com',
            excerpt: 'Test',
            source: 'TechCrunch',
            tags: ['ai'],
            publishedAt: new Date(),
            feedId: 'feed-1',
            createdAt: new Date(),
          },
          createdAt: new Date(),
        },
      ]

      prismaMock.savedArticle.findMany.mockResolvedValue(mockArticles)

      const result = await articleService.getUserSavedArticles(userId)

      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Test Article')
    })

    it('should apply source filter', async () => {
      const userId = 'user-123'
      prismaMock.savedArticle.findMany.mockResolvedValue([])

      await articleService.getUserSavedArticles(userId, {
        source: 'TechCrunch',
      })

      expect(prismaMock.savedArticle.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          article: { source: 'TechCrunch' },
        },
        include: { article: true },
        orderBy: { createdAt: 'desc' },
      })
    })
  })
})
```

**Implémentation:**

- [ ] Create `services/article.service.ts`
- [ ] Implement `getUserSavedArticles(userId, filters?)`
- [ ] Run test: `npm test -- article.service.test.ts`
- [ ] Commit: "feat: add ArticleService.getUserSavedArticles"

---

### Feature 1.2.4: ArticleService.saveArticle()

**Test:** Save article

```typescript
describe('ArticleService', () => {
  describe('saveArticle', () => {
    it('should save article for user', async () => {
      const userId = 'user-123'
      const articleId = 'article-1'

      prismaMock.user.findUnique.mockResolvedValue({
        id: userId,
        plan: 'FREE',
      })

      prismaMock.savedArticle.count.mockResolvedValue(5) // Under limit

      prismaMock.savedArticle.create.mockResolvedValue({
        id: 'saved-1',
        userId,
        articleId,
        createdAt: new Date(),
      })

      await articleService.saveArticle(userId, articleId)

      expect(prismaMock.savedArticle.create).toHaveBeenCalled()
    })

    it('should throw error if limit reached (FREE plan)', async () => {
      const userId = 'user-123'
      const articleId = 'article-1'

      prismaMock.user.findUnique.mockResolvedValue({
        id: userId,
        plan: 'FREE',
      })

      prismaMock.savedArticle.count.mockResolvedValue(10) // At limit

      await expect(
        articleService.saveArticle(userId, articleId)
      ).rejects.toThrow('Plan limit reached')
    })

    it('should allow unlimited for PRO plan', async () => {
      const userId = 'user-123'
      const articleId = 'article-1'

      prismaMock.user.findUnique.mockResolvedValue({
        id: userId,
        plan: 'PRO',
      })

      prismaMock.savedArticle.count.mockResolvedValue(9999)

      prismaMock.savedArticle.create.mockResolvedValue({
        id: 'saved-1',
        userId,
        articleId,
        createdAt: new Date(),
      })

      await articleService.saveArticle(userId, articleId)

      expect(prismaMock.savedArticle.create).toHaveBeenCalled()
    })
  })
})
```

**Implémentation:**

- [ ] Implement `saveArticle(userId, articleId)`
- [ ] Check plan limits before saving
- [ ] Run test: `npm test -- article.service.test.ts`
- [ ] Commit: "feat: add ArticleService.saveArticle with plan limits"

---

### Feature 1.2.5: GET /api/articles

**Test:** Articles list endpoint

```typescript
// apps/backend/src/__tests__/integration/articles.test.ts
describe('Articles API', () => {
  describe('GET /api/articles', () => {
    beforeEach(async () => {
      // Seed articles
      await prisma.article.createMany({
        data: [
          {
            title: 'Article 1',
            url: 'https://example.com/1',
            source: 'TechCrunch',
            tags: ['ai'],
            publishedAt: new Date(),
            feedId: 'feed-1',
          },
          {
            title: 'Article 2',
            url: 'https://example.com/2',
            source: 'HackerNews',
            tags: ['dev'],
            publishedAt: new Date(),
            feedId: 'feed-1',
          },
        ],
      })
    })

    it('should return articles list', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/articles',
        headers: { authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(200)
      const { articles } = response.json()
      expect(articles).toHaveLength(2)
    })

    it('should filter by source', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/articles?source=TechCrunch',
        headers: { authorization: `Bearer ${authToken}` },
      })

      const { articles } = response.json()
      expect(articles).toHaveLength(1)
      expect(articles[0].source).toBe('TechCrunch')
    })

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/articles',
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
```

**Implémentation:**

- [ ] Create `routes/articles.routes.ts`
- [ ] Create `controllers/article.controller.ts`
- [ ] Implement `GET /api/articles` with filters
- [ ] Run test: `npm test -- articles.test.ts`
- [ ] Commit: "feat: add GET /api/articles endpoint"

---

### Feature 1.2.6: POST /api/articles/:id/save

**Test:** Save article endpoint

```typescript
describe('Articles API', () => {
  describe('POST /api/articles/:id/save', () => {
    it('should save article', async () => {
      const article = await prisma.article.create({
        data: {
          title: 'Test',
          url: 'https://example.com',
          source: 'Test',
          tags: [],
          publishedAt: new Date(),
          feedId: 'feed-1',
        },
      })

      const response = await app.inject({
        method: 'POST',
        url: `/api/articles/${article.id}/save`,
        headers: { authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(201)
    })

    it('should return 403 if limit reached', async () => {
      // Save 10 articles (FREE limit)
      for (let i = 0; i < 10; i++) {
        await prisma.savedArticle.create({
          data: {
            userId: user.id,
            articleId: `article-${i}`,
          },
        })
      }

      const response = await app.inject({
        method: 'POST',
        url: `/api/articles/new-article/save`,
        headers: { authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(403)
      expect(response.json().error).toBe('Plan limit reached')
    })
  })
})
```

**Implémentation:**

- [ ] Implement `POST /api/articles/:id/save`
- [ ] Use `checkPlanLimit` middleware
- [ ] Run test: `npm test -- articles.test.ts`
- [ ] Commit: "feat: add POST /api/articles/:id/save endpoint"

---

### Feature 1.2.7: DELETE /api/articles/:id/unsave

**Test:** Unsave article endpoint

```typescript
describe('Articles API', () => {
  describe('DELETE /api/articles/:id/unsave', () => {
    it('should unsave article', async () => {
      const saved = await prisma.savedArticle.create({
        data: {
          userId: user.id,
          articleId: 'article-1',
        },
      })

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/articles/article-1/unsave`,
        headers: { authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(200)

      const deleted = await prisma.savedArticle.findUnique({
        where: { id: saved.id },
      })
      expect(deleted).toBeNull()
    })

    it('should return 404 if not saved', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/articles/not-saved/unsave`,
        headers: { authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(404)
    })
  })
})
```

**Implémentation:**

- [ ] Implement `DELETE /api/articles/:id/unsave`
- [ ] Delete from savedArticles
- [ ] Run test: `npm test -- articles.test.ts`
- [ ] Commit: "feat: add DELETE /api/articles/:id/unsave endpoint"

---

### Feature 1.2.8: RSS Queue & Worker

**Test:** RSS queue processes feeds

```typescript
// apps/backend/src/__tests__/unit/queues/rss.worker.test.ts
import { rssWorker } from '@/queues/rss.worker'
import { prismaMock } from '../../mocks/prisma.mock'
import { RSSService } from '@/services/rss.service'

jest.mock('@/services/rss.service')

describe('RSS Worker', () => {
  it('should fetch and store articles from active feeds', async () => {
    const mockFeeds = [
      {
        id: 'feed-1',
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed',
        active: true,
      },
    ]

    const mockArticles = [
      {
        title: 'New Article',
        url: 'https://example.com/new',
        excerpt: 'Test',
        publishedAt: new Date(),
        tags: ['ai'],
      },
    ]

    prismaMock.rSSFeed.findMany.mockResolvedValue(mockFeeds)
    ;(RSSService.prototype.parseFeed as jest.Mock).mockResolvedValue(
      mockArticles
    )

    await rssWorker.process()

    expect(prismaMock.article.upsert).toHaveBeenCalledWith({
      where: { url: 'https://example.com/new' },
      update: {},
      create: expect.objectContaining({
        title: 'New Article',
        url: 'https://example.com/new',
      }),
    })
  })
})
```

**Implémentation:**

- [ ] Create `queues/rss.queue.ts`
- [ ] Create `queues/rss.worker.ts`
- [ ] Schedule cron job (every hour)
- [ ] Run test: `npm test -- rss.worker.test.ts`
- [ ] Commit: "feat: add RSS queue and worker for auto-fetch"

---

### Feature 1.2.9: Seed RSS Feeds

**Test:** Seed script works

```bash
# Test: Run seed script
npx prisma db seed

# Verify feeds exist
psql -d noteflow -c "SELECT COUNT(*) FROM \"RSSFeed\";"
# Should return 3-5
```

**Implémentation:**

- [ ] Create `prisma/seed.ts`
- [ ] Add 3-5 RSS feeds (dev/AI sources)
- [ ] Add seed script to `package.json`
- [ ] Run: `npx prisma db seed`
- [ ] Commit: "feat: add RSS feed seeds (dev/AI sources)"

---

## Sprint 1.3: Veille IA - Frontend

### Feature 1.3.1: ArticleCard component

**Test:** Component renders

```typescript
// apps/frontend/__tests__/components/veille/ArticleCard.test.tsx
import { render, screen } from '@testing-library/react';
import { ArticleCard } from '@/components/veille/ArticleCard';

const mockArticle = {
  id: 'article-1',
  title: 'Test Article',
  url: 'https://example.com',
  excerpt: 'Test excerpt',
  source: 'TechCrunch',
  tags: ['ai', 'dev'],
  publishedAt: new Date('2025-01-15'),
};

describe('ArticleCard', () => {
  it('should render article info', () => {
    render(<ArticleCard article={mockArticle} />);

    expect(screen.getByText('Test Article')).toBeInTheDocument();
    expect(screen.getByText('Test excerpt')).toBeInTheDocument();
    expect(screen.getByText('TechCrunch')).toBeInTheDocument();
    expect(screen.getByText('ai')).toBeInTheDocument();
  });

  it('should show save button when not saved', () => {
    render(<ArticleCard article={mockArticle} isSaved={false} />);

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('should open link in new tab', () => {
    render(<ArticleCard article={mockArticle} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
```

**Implémentation:**

- [ ] Create `components/veille/ArticleCard.tsx`
- [ ] Display title, excerpt, source, tags, date
- [ ] Save/unsave button
- [ ] Run test: `npm test -- ArticleCard.test.tsx`
- [ ] Commit: "feat: add ArticleCard component"

---

### Feature 1.3.2: useArticles hook

**Test:** Hook fetches articles

```typescript
// apps/frontend/__tests__/hooks/useArticles.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useArticles } from '@/lib/hooks/useArticles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/articles', (req, res, ctx) => {
    return res(
      ctx.json({
        articles: [
          { id: '1', title: 'Article 1' },
          { id: '2', title: 'Article 2' },
        ],
      })
    );
  })
);

beforeAll(() => server.listen());
afterAll(() => server.close());

describe('useArticles', () => {
  it('should fetch articles', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useArticles(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].title).toBe('Article 1');
  });

  it('should apply filters', async () => {
    const queryClient = new QueryClient();
    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useArticles({ source: 'TechCrunch' }), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
```

**Implémentation:**

- [ ] Create `lib/hooks/useArticles.ts`
- [ ] Use TanStack Query
- [ ] Support filters (source, tags)
- [ ] Run test: `npm test -- useArticles.test.ts`
- [ ] Commit: "feat: add useArticles hook"

---

### Feature 1.3.3: useSaveArticle hook

**Test:** Hook saves article

```typescript
// apps/frontend/__tests__/hooks/useSaveArticle.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useSaveArticle } from '@/lib/hooks/useArticles'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.post('/api/articles/:id/save', (req, res, ctx) => {
    return res(ctx.status(201))
  })
)

describe('useSaveArticle', () => {
  it('should save article', async () => {
    const { result } = renderHook(() => useSaveArticle())

    result.current.mutate('article-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('should handle limit error', async () => {
    server.use(
      rest.post('/api/articles/:id/save', (req, res, ctx) => {
        return res(ctx.status(403), ctx.json({ error: 'Plan limit reached' }))
      })
    )

    const { result } = renderHook(() => useSaveArticle())

    result.current.mutate('article-1')

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error.message).toContain('Plan limit reached')
  })
})
```

**Implémentation:**

- [ ] Create `useSaveArticle()` mutation
- [ ] Invalidate queries on success
- [ ] Handle errors (plan limits)
- [ ] Run test: `npm test -- useSaveArticle.test.ts`
- [ ] Commit: "feat: add useSaveArticle hook"

---

### Feature 1.3.4: ArticleList component

**Test:** List renders articles

```typescript
// apps/frontend/__tests__/components/veille/ArticleList.test.tsx
import { render, screen } from '@testing-library/react';
import { ArticleList } from '@/components/veille/ArticleList';

const mockArticles = [
  { id: '1', title: 'Article 1', url: 'https://example.com/1' },
  { id: '2', title: 'Article 2', url: 'https://example.com/2' },
];

describe('ArticleList', () => {
  it('should render all articles', () => {
    render(<ArticleList articles={mockArticles} />);

    expect(screen.getByText('Article 1')).toBeInTheDocument();
    expect(screen.getByText('Article 2')).toBeInTheDocument();
  });

  it('should show empty state when no articles', () => {
    render(<ArticleList articles={[]} />);

    expect(screen.getByText(/no articles found/i)).toBeInTheDocument();
  });
});
```

**Implémentation:**

- [ ] Create `components/veille/ArticleList.tsx`
- [ ] Map articles to ArticleCard
- [ ] Empty state
- [ ] Run test: `npm test -- ArticleList.test.tsx`
- [ ] Commit: "feat: add ArticleList component"

---

### Feature 1.3.5: ArticleFilters component

**Test:** Filters work

```typescript
// apps/frontend/__tests__/components/veille/ArticleFilters.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ArticleFilters } from '@/components/veille/ArticleFilters';

describe('ArticleFilters', () => {
  it('should render source filter', () => {
    const onChange = jest.fn();
    render(<ArticleFilters filters={{}} onChange={onChange} />);

    expect(screen.getByLabelText(/source/i)).toBeInTheDocument();
  });

  it('should call onChange when source changes', () => {
    const onChange = jest.fn();
    render(<ArticleFilters filters={{}} onChange={onChange} />);

    const select = screen.getByLabelText(/source/i);
    fireEvent.change(select, { target: { value: 'TechCrunch' } });

    expect(onChange).toHaveBeenCalledWith({ source: 'TechCrunch' });
  });

  it('should render tag filters', () => {
    const onChange = jest.fn();
    render(<ArticleFilters filters={{}} onChange={onChange} />);

    expect(screen.getByText(/tags/i)).toBeInTheDocument();
  });
});
```

**Implémentation:**

- [ ] Create `components/veille/ArticleFilters.tsx`
- [ ] Source select
- [ ] Tags checkboxes
- [ ] Run test: `npm test -- ArticleFilters.test.tsx`
- [ ] Commit: "feat: add ArticleFilters component"

---

### Feature 1.3.6: Veille page

**Test:** Page integrates components

```typescript
// apps/frontend/__tests__/pages/veille.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import VeillePage from '@/app/(dashboard)/veille/page';

describe('Veille Page', () => {
  it('should render filters', () => {
    render(<VeillePage />);

    expect(screen.getByLabelText(/source/i)).toBeInTheDocument();
  });

  it('should render article list', async () => {
    render(<VeillePage />);

    await waitFor(() => {
      expect(screen.getByText(/article/i)).toBeInTheDocument();
    });
  });

  it('should show plan usage', () => {
    render(<VeillePage />);

    expect(screen.getByText(/saved/i)).toBeInTheDocument();
  });
});
```

**Implémentation:**

- [ ] Create `app/(dashboard)/veille/page.tsx`
- [ ] Integrate ArticleFilters, ArticleList
- [ ] Show plan usage (X/10 saved)
- [ ] Run test: `npm test -- veille.test.tsx`
- [ ] Commit: "feat: add veille page"

---

### Feature 1.3.7: i18n for Veille

**Test:** Translations work

```typescript
// apps/frontend/__tests__/i18n/veille.test.ts
import { i18n } from '@/lib/i18n/config'

describe('Veille i18n', () => {
  it('should translate veille.title in French', () => {
    i18n.changeLanguage('fr')
    expect(i18n.t('veille.title')).toBe('Veille IA')
  })

  it('should translate veille.title in English', () => {
    i18n.changeLanguage('en')
    expect(i18n.t('veille.title')).toBe('AI Watch')
  })

  it('should translate filters', () => {
    i18n.changeLanguage('fr')
    expect(i18n.t('veille.filters.source')).toBe('Source')
  })
})
```

**Implémentation:**

- [ ] Add veille translations to `fr.json`
- [ ] Add veille translations to `en.json`
- [ ] Use translations in components
- [ ] Run test: `npm test -- veille.test.ts`
- [ ] Commit: "feat: add i18n for veille feature"

---

## Sprint 1.4: PowerPost - Backend (Résumés IA)

### Feature 1.4.1: Prisma Summary model

**Test:** Schema validation

```bash
npx prisma generate
npx prisma validate
```

**Implémentation:**

- [ ] Add `Summary` model
- [ ] Add `SummaryStyle` enum (6 styles)
- [ ] Migration: `npx prisma migrate dev --name add-summary-model`
- [ ] Commit: "feat: add Summary model with 6 styles"

---

### Feature 1.4.2: AIService.generateSummary()

**Test:** Generate summary with OpenAI

```typescript
// apps/backend/src/__tests__/unit/services/ai.service.test.ts
import { AIService } from '@/services/ai.service'
import OpenAI from 'openai'

jest.mock('openai')

describe('AIService', () => {
  let aiService: AIService

  beforeEach(() => {
    aiService = new AIService()
  })

  describe('generateSummary', () => {
    it('should generate SHORT summary', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'This is a short summary.' } }],
      }

      ;(
        OpenAI.prototype.chat.completions.create as jest.Mock
      ).mockResolvedValue(mockResponse)

      const result = await aiService.generateSummary(
        'Long text...',
        'SHORT',
        'en'
      )

      expect(result).toBe('This is a short summary.')
      expect(OpenAI.prototype.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'system',
              content: expect.stringContaining('2-3 short'),
            }),
          ]),
        })
      )
    })

    it('should generate TWEET summary (max 280 chars)', async () => {
      const mockResponse = {
        choices: [{ message: { content: 'Tweet summary in 280 chars' } }],
      }

      ;(
        OpenAI.prototype.chat.completions.create as jest.Mock
      ).mockResolvedValue(mockResponse)

      const result = await aiService.generateSummary(
        'Long text...',
        'TWEET',
        'fr'
      )

      expect(result).toBe('Tweet summary in 280 chars')
      expect(result.length).toBeLessThanOrEqual(280)
    })

    it('should use correct language prompt', async () => {
      await aiService.generateSummary('Text', 'SHORT', 'fr')

      expect(OpenAI.prototype.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('Résume'),
            }),
          ]),
        })
      )
    })
  })
})
```

**Implémentation:**

- [ ] Create `services/ai.service.ts`
- [ ] Install `openai` package
- [ ] Implement `generateSummary(text, style, language)`
- [ ] 6 prompts (SHORT, TWEET, THREAD, BULLET_POINT, TOP3, MAIN_POINTS)
- [ ] Run test: `npm test -- ai.service.test.ts`
- [ ] Commit: "feat: add AIService with OpenAI integration"

---

### Feature 1.4.3: AIService.extractTextFromPDF()

**Test:** Extract text from PDF

```typescript
describe('AIService', () => {
  describe('extractTextFromPDF', () => {
    it('should extract text from PDF buffer', async () => {
      const pdfBuffer = Buffer.from('mock-pdf-content')
      const text = await aiService.extractTextFromPDF(pdfBuffer)

      expect(text).toBeDefined()
      expect(typeof text).toBe('string')
      expect(text.length).toBeGreaterThan(0)
    })

    it('should throw error for invalid PDF', async () => {
      const invalidBuffer = Buffer.from('not-a-pdf')

      await expect(
        aiService.extractTextFromPDF(invalidBuffer)
      ).rejects.toThrow()
    })
  })
})
```

**Implémentation:**

- [ ] Install `pdf-parse`
- [ ] Implement `extractTextFromPDF(buffer)`
- [ ] Error handling
- [ ] Run test: `npm test -- ai.service.test.ts`
- [ ] Commit: "feat: add PDF text extraction"

---

### Feature 1.4.4: SummaryService.createSummary()

**Test:** Create summary job

```typescript
// apps/backend/src/__tests__/unit/services/summary.service.test.ts
import { SummaryService } from '@/services/summary.service'
import { summaryQueue } from '@/queues/summary.queue'

jest.mock('@/queues/summary.queue')

describe('SummaryService', () => {
  let summaryService: SummaryService

  beforeEach(() => {
    summaryService = new SummaryService()
  })

  describe('createSummary', () => {
    it('should create summary job and return jobId', async () => {
      const mockJob = { id: 'job-123' }
      ;(summaryQueue.add as jest.Mock).mockResolvedValue(mockJob)

      const result = await summaryService.createSummary(
        'user-123',
        'Long text',
        'SHORT'
      )

      expect(result.jobId).toBe('job-123')
      expect(summaryQueue.add).toHaveBeenCalledWith(
        'generate-summary',
        expect.objectContaining({
          userId: 'user-123',
          text: 'Long text',
          style: 'SHORT',
        })
      )
    })

    it('should check plan limits before creating job', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ plan: 'FREE' })
      prismaMock.summary.count.mockResolvedValue(5) // At limit

      await expect(
        summaryService.createSummary('user-123', 'Text', 'SHORT')
      ).rejects.toThrow('Plan limit reached')
    })

    it('should allow PRO users unlimited summaries', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ plan: 'PRO' })
      prismaMock.summary.count.mockResolvedValue(9999)

      const mockJob = { id: 'job-123' }
      ;(summaryQueue.add as jest.Mock).mockResolvedValue(mockJob)

      const result = await summaryService.createSummary(
        'user-123',
        'Text',
        'SHORT'
      )

      expect(result.jobId).toBe('job-123')
    })
  })
})
```

**Implémentation:**

- [ ] Create `services/summary.service.ts`
- [ ] Implement `createSummary(userId, text, style)`
- [ ] Check plan limits (monthly)
- [ ] Create BullMQ job
- [ ] Run test: `npm test -- summary.service.test.ts`
- [ ] Commit: "feat: add SummaryService.createSummary with limits"

---

### Feature 1.4.5: Summary Queue & Worker

**Test:** Worker processes summary jobs

```typescript
// apps/backend/src/__tests__/unit/queues/summary.worker.test.ts
import { summaryWorker } from '@/queues/summary.worker'
import { AIService } from '@/services/ai.service'
import { prismaMock } from '../../mocks/prisma.mock'

jest.mock('@/services/ai.service')

describe('Summary Worker', () => {
  it('should generate summary and save to DB', async () => {
    const jobData = {
      userId: 'user-123',
      text: 'Long article text...',
      style: 'SHORT',
      language: 'en',
    }

    ;(AIService.prototype.generateSummary as jest.Mock).mockResolvedValue(
      'This is a short summary.'
    )

    await summaryWorker.process({ data: jobData })

    expect(AIService.prototype.generateSummary).toHaveBeenCalledWith(
      'Long article text...',
      'SHORT',
      'en'
    )

    expect(prismaMock.summary.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-123',
        originalText: 'Long article text...',
        summaryText: 'This is a short summary.',
        style: 'SHORT',
      }),
    })
  })

  it('should retry on failure', async () => {
    ;(AIService.prototype.generateSummary as jest.Mock).mockRejectedValue(
      new Error('OpenAI error')
    )

    await expect(
      summaryWorker.process({
        data: { userId: 'user-123', text: 'Text', style: 'SHORT' },
      })
    ).rejects.toThrow('OpenAI error')
  })
})
```

**Implémentation:**

- [ ] Create `queues/summary.queue.ts`
- [ ] Create `queues/summary.worker.ts`
- [ ] Process job: call AIService → save to DB
- [ ] Error handling & retries
- [ ] Run test: `npm test -- summary.worker.test.ts`
- [ ] Commit: "feat: add summary queue and worker"

---

### Feature 1.4.6: POST /api/summaries

**Test:** Create summary endpoint

```typescript
// apps/backend/src/__tests__/integration/summaries.test.ts
describe('Summaries API', () => {
  describe('POST /api/summaries', () => {
    it('should create summary job', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/summaries',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          text: 'Long article text...',
          style: 'SHORT',
        },
      })

      expect(response.statusCode).toBe(202) // Accepted
      expect(response.json()).toHaveProperty('jobId')
    })

    it('should return 403 if limit reached (FREE)', async () => {
      // Create 5 summaries this month (FREE limit)
      const startOfMonth = new Date()
      startOfMonth.setDate(1)

      for (let i = 0; i < 5; i++) {
        await prisma.summary.create({
          data: {
            userId: user.id,
            originalText: `Text ${i}`,
            summaryText: `Summary ${i}`,
            style: 'SHORT',
            createdAt: startOfMonth,
          },
        })
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/summaries',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { text: 'Text', style: 'SHORT' },
      })

      expect(response.statusCode).toBe(403)
      expect(response.json().error).toBe('Plan limit reached')
    })

    it('should accept PDF file', async () => {
      const form = new FormData()
      form.append('file', Buffer.from('pdf-content'), 'test.pdf')
      form.append('style', 'SHORT')

      const response = await app.inject({
        method: 'POST',
        url: '/api/summaries',
        headers: { authorization: `Bearer ${authToken}` },
        payload: form,
      })

      expect(response.statusCode).toBe(202)
    })
  })
})
```

**Implémentation:**

- [ ] Create `routes/summaries.routes.ts`
- [ ] Create `controllers/summary.controller.ts`
- [ ] Support text + PDF upload
- [ ] Validate style enum
- [ ] Run test: `npm test -- summaries.test.ts`
- [ ] Commit: "feat: add POST /api/summaries endpoint"

---

### Feature 1.4.7: GET /api/summaries/:jobId/status

**Test:** Get job status

```typescript
describe('Summaries API', () => {
  describe('GET /api/summaries/:jobId/status', () => {
    it('should return pending status', async () => {
      // Create pending job in queue
      const job = await summaryQueue.add('generate-summary', {
        userId: user.id,
        text: 'Text',
        style: 'SHORT',
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/summaries/${job.id}/status`,
        headers: { authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().status).toBe('pending')
    })

    it('should return completed status with summary', async () => {
      const summary = await prisma.summary.create({
        data: {
          userId: user.id,
          originalText: 'Text',
          summaryText: 'Summary',
          style: 'SHORT',
        },
      })

      const response = await app.inject({
        method: 'GET',
        url: `/api/summaries/completed-job-id/status`,
        headers: { authorization: `Bearer ${authToken}` },
      })

      expect(response.json().status).toBe('completed')
      expect(response.json().summary).toBeDefined()
    })
  })
})
```

**Implémentation:**

- [ ] Implement `GET /api/summaries/:jobId/status`
- [ ] Check BullMQ job status
- [ ] Return summary if completed
- [ ] Run test: `npm test -- summaries.test.ts`
- [ ] Commit: "feat: add GET /api/summaries/:jobId/status endpoint"

---

### Feature 1.4.8: GET /api/summaries (user history)

**Test:** Get user summaries

```typescript
describe('Summaries API', () => {
  describe('GET /api/summaries', () => {
    it('should return user summaries', async () => {
      await prisma.summary.createMany({
        data: [
          {
            userId: user.id,
            originalText: 'Text 1',
            summaryText: 'Summary 1',
            style: 'SHORT',
          },
          {
            userId: user.id,
            originalText: 'Text 2',
            summaryText: 'Summary 2',
            style: 'TWEET',
          },
        ],
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/summaries',
        headers: { authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(200)
      const { summaries } = response.json()
      expect(summaries).toHaveLength(2)
    })

    it('should paginate results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/summaries?page=1&limit=10',
        headers: { authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(200)
    })
  })
})
```

**Implémentation:**

- [ ] Implement `GET /api/summaries`
- [ ] Pagination support
- [ ] Order by createdAt DESC
- [ ] Run test: `npm test -- summaries.test.ts`
- [ ] Commit: "feat: add GET /api/summaries endpoint"

---

## Sprint 1.5: PowerPost - Frontend

### Feature 1.5.1: StyleSelector component

**Test:** Style selector works

```typescript
// apps/frontend/__tests__/components/summaries/StyleSelector.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { StyleSelector } from '@/components/summaries/StyleSelector';

describe('StyleSelector', () => {
  const styles = ['SHORT', 'TWEET', 'THREAD', 'BULLET_POINT'];

  it('should render all styles', () => {
    render(<StyleSelector value="SHORT" onChange={jest.fn()} />);

    styles.forEach((style) => {
      expect(screen.getByText(style)).toBeInTheDocument();
    });
  });

  it('should call onChange when style clicked', () => {
    const onChange = jest.fn();
    render(<StyleSelector value="SHORT" onChange={onChange} />);

    fireEvent.click(screen.getByText('TWEET'));

    expect(onChange).toHaveBeenCalledWith('TWEET');
  });

  it('should highlight selected style', () => {
    render(<StyleSelector value="TWEET" onChange={jest.fn()} />);

    const tweetButton = screen.getByText('TWEET');
    expect(tweetButton).toHaveClass('selected'); // or bg-primary, etc.
  });
});
```

**Implémentation:**

- [ ] Create `components/summaries/StyleSelector.tsx`
- [ ] Display 6 styles as buttons/cards
- [ ] Icons for each style
- [ ] Run test: `npm test -- StyleSelector.test.tsx`
- [ ] Commit: "feat: add StyleSelector component"

---

### Feature 1.5.2: SummaryForm component

**Test:** Form works

```typescript
// apps/frontend/__tests__/components/summaries/SummaryForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SummaryForm } from '@/components/summaries/SummaryForm';

describe('SummaryForm', () => {
  it('should render source selector', () => {
    render(<SummaryForm />);

    expect(screen.getByText(/text/i)).toBeInTheDocument();
    expect(screen.getByText(/pdf/i)).toBeInTheDocument();
  });

  it('should show textarea when text source selected', () => {
    render(<SummaryForm />);

    fireEvent.click(screen.getByText(/text/i));

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should show file input when PDF source selected', () => {
    render(<SummaryForm />);

    fireEvent.click(screen.getByText(/pdf/i));

    expect(screen.getByLabelText(/upload/i)).toBeInTheDocument();
  });

  it('should require text/file before submit', () => {
    render(<SummaryForm />);

    const submitButton = screen.getByRole('button', { name: /generate/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit when text provided', () => {
    render(<SummaryForm />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Some text' } });

    const submitButton = screen.getByRole('button', { name: /generate/i });
    expect(submitButton).not.toBeDisabled();
  });
});
```

**Implémentation:**

- [ ] Create `components/summaries/SummaryForm.tsx`
- [ ] Source selector (text, PDF)
- [ ] Conditional input (textarea or file upload)
- [ ] StyleSelector integration
- [ ] Validation
- [ ] Run test: `npm test -- SummaryForm.test.tsx`
- [ ] Commit: "feat: add SummaryForm component"

---

### Feature 1.5.3: useCreateSummary hook

**Test:** Hook creates summary

```typescript
// apps/frontend/__tests__/hooks/useSummaries.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useCreateSummary } from '@/lib/hooks/useSummaries'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.post('/api/summaries', (req, res, ctx) => {
    return res(ctx.status(202), ctx.json({ jobId: 'job-123' }))
  })
)

describe('useCreateSummary', () => {
  it('should create summary and return jobId', async () => {
    const { result } = renderHook(() => useCreateSummary())

    result.current.mutate({ text: 'Long text', style: 'SHORT' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data.jobId).toBe('job-123')
  })

  it('should handle limit error', async () => {
    server.use(
      rest.post('/api/summaries', (req, res, ctx) => {
        return res(ctx.status(403), ctx.json({ error: 'Plan limit reached' }))
      })
    )

    const { result } = renderHook(() => useCreateSummary())

    result.current.mutate({ text: 'Text', style: 'SHORT' })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

**Implémentation:**

- [ ] Create `lib/hooks/useSummaries.ts`
- [ ] `useCreateSummary()` mutation
- [ ] Handle FormData for PDF upload
- [ ] Error handling
- [ ] Run test: `npm test -- useSummaries.test.ts`
- [ ] Commit: "feat: add useCreateSummary hook"

---

### Feature 1.5.4: useSummaryStatus hook (polling)

**Test:** Hook polls job status

```typescript
describe('useSummaryStatus', () => {
  it('should poll job status until completed', async () => {
    let callCount = 0
    server.use(
      rest.get('/api/summaries/:jobId/status', (req, res, ctx) => {
        callCount++
        if (callCount < 3) {
          return res(ctx.json({ status: 'pending' }))
        }
        return res(
          ctx.json({
            status: 'completed',
            summary: { text: 'Summary' },
          })
        )
      })
    )

    const { result } = renderHook(() => useSummaryStatus('job-123'))

    await waitFor(() => {
      expect(result.current.data.status).toBe('completed')
    })

    expect(callCount).toBeGreaterThanOrEqual(3)
  })

  it('should stop polling when completed', async () => {
    server.use(
      rest.get('/api/summaries/:jobId/status', (req, res, ctx) => {
        return res(ctx.json({ status: 'completed' }))
      })
    )

    const { result } = renderHook(() => useSummaryStatus('job-123'))

    await waitFor(() => {
      expect(result.current.data.status).toBe('completed')
    })

    // Should not refetch
    await new Promise(resolve => setTimeout(resolve, 3000))
    // Verify no more calls
  })
})
```

**Implémentation:**

- [ ] Create `useSummaryStatus(jobId)` hook
- [ ] Poll every 2s if pending
- [ ] Stop polling if completed/failed
- [ ] Run test: `npm test -- useSummaries.test.ts`
- [ ] Commit: "feat: add useSummaryStatus hook with polling"

---

### Feature 1.5.5: SummaryDisplay component

**Test:** Display summary

```typescript
// apps/frontend/__tests__/components/summaries/SummaryDisplay.test.tsx
import { render, screen } from '@testing-library/react';
import { SummaryDisplay } from '@/components/summaries/SummaryDisplay';

const mockSummary = {
  id: 'summary-1',
  summaryText: 'This is a summary.',
  originalText: 'Long original text...',
  style: 'SHORT',
  createdAt: new Date(),
};

describe('SummaryDisplay', () => {
  it('should render summary text', () => {
    render(<SummaryDisplay summary={mockSummary} />);

    expect(screen.getByText('This is a summary.')).toBeInTheDocument();
  });

  it('should show style badge', () => {
    render(<SummaryDisplay summary={mockSummary} />);

    expect(screen.getByText('SHORT')).toBeInTheDocument();
  });

  it('should have copy button', () => {
    render(<SummaryDisplay summary={mockSummary} />);

    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument();
  });

  it('should toggle original text', () => {
    render(<SummaryDisplay summary={mockSummary} />);

    const toggleButton = screen.getByRole('button', { name: /original/i });
    fireEvent.click(toggleButton);

    expect(screen.getByText('Long original text...')).toBeInTheDocument();
  });
});
```

**Implémentation:**

- [ ] Create `components/summaries/SummaryDisplay.tsx`
- [ ] Show summary text
- [ ] Style badge
- [ ] Copy to clipboard button
- [ ] Toggle original text
- [ ] Run test: `npm test -- SummaryDisplay.test.tsx`
- [ ] Commit: "feat: add SummaryDisplay component"

---

### Feature 1.5.6: Summaries page

**Test:** Page integrates all components

```typescript
// apps/frontend/__tests__/pages/summaries.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SummariesPage from '@/app/(dashboard)/summaries/page';

describe('Summaries Page', () => {
  it('should render form', () => {
    render(<SummariesPage />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should create summary on submit', async () => {
    render(<SummariesPage />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Long text' } });

    const submitButton = screen.getByRole('button', { name: /generate/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    });
  });

  it('should show summary when completed', async () => {
    render(<SummariesPage />);

    // Submit form
    // ...

    await waitFor(() => {
      expect(screen.getByText(/summary generated/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('should show history sidebar', () => {
    render(<SummariesPage />);

    expect(screen.getByText(/history/i)).toBeInTheDocument();
  });
});
```

**Implémentation:**

- [ ] Create `app/(dashboard)/summaries/page.tsx`
- [ ] Two-column layout (form left, history right)
- [ ] Show loading state during generation
- [ ] Display summary when ready
- [ ] Run test: `npm test -- summaries.test.tsx`
- [ ] Commit: "feat: add summaries page"

---

## Sprint 1.6: PowerNote - Backend

### Feature 1.6.1: Prisma Note model

**Test:** Schema validation

```bash
npx prisma generate
npx prisma validate
```

**Implémentation:**

- [ ] Add `Note` model
- [ ] Migration: `npx prisma migrate dev --name add-note-model`
- [ ] Commit: "feat: add Note model"

---

### Feature 1.6.2: NoteService CRUD

**Test:** Note service methods

```typescript
// apps/backend/src/__tests__/unit/services/note.service.test.ts
import { NoteService } from '@/services/note.service'
import { prismaMock } from '../../mocks/prisma.mock'

describe('NoteService', () => {
  let noteService: NoteService

  beforeEach(() => {
    noteService = new NoteService()
  })

  describe('createNote', () => {
    it('should create note for user', async () => {
      const noteData = {
        title: 'Test Note',
        content: 'Content',
        tags: ['test'],
      }

      prismaMock.user.findUnique.mockResolvedValue({ plan: 'FREE' })
      prismaMock.note.count.mockResolvedValue(5) // Under limit

      prismaMock.note.create.mockResolvedValue({
        id: 'note-1',
        userId: 'user-123',
        ...noteData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await noteService.createNote('user-123', noteData)

      expect(result.title).toBe('Test Note')
    })

    it('should throw error if limit reached (FREE)', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ plan: 'FREE' })
      prismaMock.note.count.mockResolvedValue(20) // At limit

      await expect(
        noteService.createNote('user-123', { title: 'Test', content: '' })
      ).rejects.toThrow('Plan limit reached')
    })
  })

  describe('getUserNotes', () => {
    it('should return user notes', async () => {
      const mockNotes = [
        { id: 'note-1', title: 'Note 1' },
        { id: 'note-2', title: 'Note 2' },
      ]

      prismaMock.note.findMany.mockResolvedValue(mockNotes)

      const result = await noteService.getUserNotes('user-123')

      expect(result).toHaveLength(2)
    })

    it('should filter by tags', async () => {
      prismaMock.note.findMany.mockResolvedValue([])

      await noteService.getUserNotes('user-123', { tags: ['work'] })

      expect(prismaMock.note.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          tags: { hasSome: ['work'] },
        },
        orderBy: { updatedAt: 'desc' },
      })
    })
  })

  describe('updateNote', () => {
    it('should update note', async () => {
      const updatedNote = {
        id: 'note-1',
        title: 'Updated Title',
        content: 'Updated content',
      }

      prismaMock.note.update.mockResolvedValue(updatedNote)

      const result = await noteService.updateNote('note-1', 'user-123', {
        title: 'Updated Title',
      })

      expect(result.title).toBe('Updated Title')
    })

    it('should throw error if note not found', async () => {
      prismaMock.note.update.mockRejectedValue(new Error('Not found'))

      await expect(
        noteService.updateNote('note-1', 'user-123', { title: 'Test' })
      ).rejects.toThrow()
    })
  })

  describe('deleteNote', () => {
    it('should delete note', async () => {
      await noteService.deleteNote('note-1', 'user-123')

      expect(prismaMock.note.delete).toHaveBeenCalledWith({
        where: { id: 'note-1', userId: 'user-123' },
      })
    })
  })

  describe('searchNotes', () => {
    it('should search notes by content', async () => {
      prismaMock.note.findMany.mockResolvedValue([
        { id: 'note-1', content: 'Contains search term' },
      ])

      const result = await noteService.searchNotes('user-123', 'search term')

      expect(result).toHaveLength(1)
      expect(prismaMock.note.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          OR: [
            { title: { contains: 'search term', mode: 'insensitive' } },
            { content: { contains: 'search term', mode: 'insensitive' } },
          ],
        },
      })
    })
  })
})
```

**Implémentation:**

- [ ] Create `services/note.service.ts`
- [ ] Implement CRUD methods
- [ ] Implement `searchNotes()`
- [ ] Check plan limits
- [ ] Run test: `npm test -- note.service.test.ts`
- [ ] Commit: "feat: add NoteService with CRUD"

---

### Feature 1.6.3: Notes API endpoints

**Test:** Note routes

```typescript
// apps/backend/src/__tests__/integration/notes.test.ts
describe('Notes API', () => {
  describe('POST /api/notes', () => {
    it('should create note', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/notes',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          title: 'My Note',
          content: 'Content here',
          tags: ['personal'],
        },
      })

      expect(response.statusCode).toBe(201)
      expect(response.json().title).toBe('My Note')
    })

    it('should return 403 if limit reached', async () => {
      // Create 20 notes (FREE limit)
      for (let i = 0; i < 20; i++) {
        await prisma.note.create({
          data: {
            userId: user.id,
            title: `Note ${i}`,
            content: 'Content',
          },
        })
      }

      const response = await app.inject({
        method: 'POST',
        url: '/api/notes',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { title: 'New Note', content: 'Content' },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('GET /api/notes', () => {
    it('should return user notes', async () => {
      await prisma.note.createMany({
        data: [
          { userId: user.id, title: 'Note 1', content: 'Content 1' },
          { userId: user.id, title: 'Note 2', content: 'Content 2' },
        ],
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/notes',
        headers: { authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(200)
      const { notes } = response.json()
      expect(notes).toHaveLength(2)
    })
  })

  describe('PATCH /api/notes/:id', () => {
    it('should update note', async () => {
      const note = await prisma.note.create({
        data: {
          userId: user.id,
          title: 'Original',
          content: 'Content',
        },
      })

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/notes/${note.id}`,
        headers: { authorization: `Bearer ${authToken}` },
        payload: { title: 'Updated' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().title).toBe('Updated')
    })
  })

  describe('DELETE /api/notes/:id', () => {
    it('should delete note', async () => {
      const note = await prisma.note.create({
        data: {
          userId: user.id,
          title: 'To Delete',
          content: 'Content',
        },
      })

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/notes/${note.id}`,
        headers: { authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(204)

      const deleted = await prisma.note.findUnique({
        where: { id: note.id },
      })
      expect(deleted).toBeNull()
    })
  })

  describe('GET /api/notes/search', () => {
    it('should search notes', async () => {
      await prisma.note.createMany({
        data: [
          {
            userId: user.id,
            title: 'JavaScript Tutorial',
            content: 'Learn JS',
          },
          { userId: user.id, title: 'Python Guide', content: 'Learn Python' },
        ],
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/notes/search?q=JavaScript',
        headers: { authorization: `Bearer ${authToken}` },
      })

      const { notes } = response.json()
      expect(notes).toHaveLength(1)
      expect(notes[0].title).toBe('JavaScript Tutorial')
    })
  })
})
```

**Implémentation:**

- [ ] Create `routes/notes.routes.ts`
- [ ] Create `controllers/note.controller.ts`
- [ ] Implement all CRUD routes
- [ ] Search endpoint
- [ ] Run test: `npm test -- notes.test.ts`
- [ ] Commit: "feat: add notes API endpoints"

---

## Sprint 1.7: PowerNote - Frontend

### Feature 1.7.1: NoteEditor component (Markdown)

**Test:** Editor works

```typescript
// apps/frontend/__tests__/components/notes/NoteEditor.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteEditor } from '@/components/notes/NoteEditor';

describe('NoteEditor', () => {
  it('should render markdown editor', () => {
    render(<NoteEditor />);

    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should call onChange when content changes', () => {
    const onChange = jest.fn();
    render(<NoteEditor value="" onChange={onChange} />);

    const editor = screen.getByRole('textbox');
    fireEvent.change(editor, { target: { value: '# Heading' } });

    expect(onChange).toHaveBeenCalledWith('# Heading');
  });

  it('should show markdown preview', () => {
    render(<NoteEditor value="# Heading" />);

    // Toggle preview
    const previewButton = screen.getByRole('button', { name: /preview/i });
    fireEvent.click(previewButton);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heading');
  });
});
```

**Implémentation:**

- [ ] Create `components/notes/NoteEditor.tsx`
- [ ] Use `react-simplemde-editor` or custom Markdown editor
- [ ] Preview toggle
- [ ] Run test: `npm test -- NoteEditor.test.tsx`
- [ ] Commit: "feat: add NoteEditor component with Markdown"

---

### Feature 1.7.2: useNotes hooks

**Test:** Hooks work

```typescript
// apps/frontend/__tests__/hooks/useNotes.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import {
  useNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
} from '@/lib/hooks/useNotes'

describe('useNotes', () => {
  it('should fetch notes', async () => {
    const { result } = renderHook(() => useNotes())

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
  })
})

describe('useCreateNote', () => {
  it('should create note', async () => {
    const { result } = renderHook(() => useCreateNote())

    result.current.mutate({
      title: 'New Note',
      content: '# Content',
      tags: ['test'],
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useUpdateNote', () => {
  it('should update note', async () => {
    const { result } = renderHook(() => useUpdateNote())

    result.current.mutate({
      id: 'note-1',
      title: 'Updated Title',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})

describe('useDeleteNote', () => {
  it('should delete note', async () => {
    const { result } = renderHook(() => useDeleteNote())

    result.current.mutate('note-1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
```

**Implémentation:**

- [ ] Create `lib/hooks/useNotes.ts`
- [ ] `useNotes()` query
- [ ] `useCreateNote()` mutation
- [ ] `useUpdateNote()` mutation
- [ ] `useDeleteNote()` mutation
- [ ] Run test: `npm test -- useNotes.test.ts`
- [ ] Commit: "feat: add useNotes hooks"

---

### Feature 1.7.3: NoteList component

**Test:** List renders notes

```typescript
// apps/frontend/__tests__/components/notes/NoteList.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { NoteList } from '@/components/notes/NoteList';

const mockNotes = [
  { id: '1', title: 'Note 1', content: 'Content 1', tags: ['work'] },
  { id: '2', title: 'Note 2', content: 'Content 2', tags: ['personal'] },
];

describe('NoteList', () => {
  it('should render all notes', () => {
    render(<NoteList notes={mockNotes} />);

    expect(screen.getByText('Note 1')).toBeInTheDocument();
    expect(screen.getByText('Note 2')).toBeInTheDocument();
  });

  it('should call onSelect when note clicked', () => {
    const onSelect = jest.fn();
    render(<NoteList notes={mockNotes} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Note 1'));

    expect(onSelect).toHaveBeenCalledWith(mockNotes[0]);
  });

  it('should show empty state', () => {
    render(<NoteList notes={[]} />);

    expect(screen.getByText(/no notes/i)).toBeInTheDocument();
  });
});
```

**Implémentation:**

- [ ] Create `components/notes/NoteList.tsx`
- [ ] Show note title + preview
- [ ] Click to select
- [ ] Empty state
- [ ] Run test: `npm test -- NoteList.test.tsx`
- [ ] Commit: "feat: add NoteList component"

---

### Feature 1.7.4: Notes page

**Test:** Page works

```typescript
// apps/frontend/__tests__/pages/notes.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NotesPage from '@/app/(dashboard)/notes/page';

describe('Notes Page', () => {
  it('should render note list', async () => {
    render(<NotesPage />);

    await waitFor(() => {
      expect(screen.getByText(/note/i)).toBeInTheDocument();
    });
  });

  it('should create new note', async () => {
    render(<NotesPage />);

    const newButton = screen.getByRole('button', { name: /new note/i });
    fireEvent.click(newButton);

    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'My Note' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('My Note')).toBeInTheDocument();
    });
  });

  it('should edit selected note', async () => {
    render(<NotesPage />);

    // Select a note
    fireEvent.click(screen.getByText('Existing Note'));

    // Editor should show
    expect(screen.getByRole('textbox')).toHaveValue('# Existing content');
  });

  it('should search notes', async () => {
    render(<NotesPage />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'JavaScript' } });

    await waitFor(() => {
      // Only matching notes shown
      expect(screen.getByText('JavaScript Tutorial')).toBeInTheDocument();
      expect(screen.queryByText('Python Guide')).not.toBeInTheDocument();
    });
  });
});
```

**Implémentation:**

- [ ] Create `app/(dashboard)/notes/page.tsx`
- [ ] Three-column layout (sidebar, list, editor)
- [ ] Create/edit/delete functionality
- [ ] Search bar
- [ ] Run test: `npm test -- notes.test.tsx`
- [ ] Commit: "feat: add notes page with full CRUD"

---

## Sprint 1.8: Dashboard & Plan Limits

### Feature 1.8.1: GET /api/users/stats

**Test:** Stats endpoint

```typescript
// apps/backend/src/__tests__/integration/user-stats.test.ts
describe('User Stats API', () => {
  describe('GET /api/users/stats', () => {
    it('should return user usage stats', async () => {
      // Create test data
      await prisma.savedArticle.createMany({
        data: [
          { userId: user.id, articleId: 'article-1' },
          { userId: user.id, articleId: 'article-2' },
        ],
      })

      const startOfMonth = new Date()
      startOfMonth.setDate(1)

      await prisma.summary.createMany({
        data: [
          {
            userId: user.id,
            originalText: 'Text 1',
            summaryText: 'Summary 1',
            style: 'SHORT',
            createdAt: startOfMonth,
          },
        ],
      })

      await prisma.note.createMany({
        data: [
          { userId: user.id, title: 'Note 1', content: 'Content' },
          { userId: user.id, title: 'Note 2', content: 'Content' },
          { userId: user.id, title: 'Note 3', content: 'Content' },
        ],
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/users/stats',
        headers: { authorization: `Bearer ${authToken}` },
      })

      expect(response.statusCode).toBe(200)
      const stats = response.json()

      expect(stats.articles.current).toBe(2)
      expect(stats.articles.limit).toBe(10) // FREE plan
      expect(stats.summaries.current).toBe(1) // This month
      expect(stats.summaries.limit).toBe(5)
      expect(stats.notes.current).toBe(3)
      expect(stats.notes.limit).toBe(20)
    })

    it('should show unlimited for PRO plan', async () => {
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: 'PRO' },
      })

      const response = await app.inject({
        method: 'GET',
        url: '/api/users/stats',
        headers: { authorization: `Bearer ${authToken}` },
      })

      const stats = response.json()
      expect(stats.articles.limit).toBe(Infinity)
      expect(stats.summaries.limit).toBe(Infinity)
      expect(stats.notes.limit).toBe(Infinity)
    })
  })
})
```

**Implémentation:**

- [ ] Create route `GET /api/users/stats`
- [ ] Count articles, summaries (monthly), notes
- [ ] Return limits based on plan
- [ ] Run test: `npm test -- user-stats.test.ts`
- [ ] Commit: "feat: add GET /api/users/stats endpoint"

---

### Feature 1.8.2: PlanUsageCard component

**Test:** Usage card displays correctly

```typescript
// apps/frontend/__tests__/components/dashboard/PlanUsageCard.test.tsx
import { render, screen } from '@testing-library/react';
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard';

const mockStats = {
  articles: { current: 5, limit: 10 },
  summaries: { current: 3, limit: 5 },
  notes: { current: 10, limit: 20 },
};

describe('PlanUsageCard', () => {
  it('should display all usage stats', () => {
    render(<PlanUsageCard stats={mockStats} />);

    expect(screen.getByText(/5.*10.*articles/i)).toBeInTheDocument();
    expect(screen.getByText(/3.*5.*summaries/i)).toBeInTheDocument();
    expect(screen.getByText(/10.*20.*notes/i)).toBeInTheDocument();
  });

  it('should show progress bars', () => {
    render(<PlanUsageCard stats={mockStats} />);

    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(3);
  });

  it('should show upgrade CTA when near limit', () => {
    const nearLimitStats = {
      articles: { current: 9, limit: 10 },
      summaries: { current: 5, limit: 5 },
      notes: { current: 18, limit: 20 },
    };

    render(<PlanUsageCard stats={nearLimitStats} />);

    expect(screen.getByText(/upgrade/i)).toBeInTheDocument();
  });

  it('should show unlimited for PRO', () => {
    const proStats = {
      articles: { current: 100, limit: Infinity },
      summaries: { current: 50, limit: Infinity },
      notes: { current: 200, limit: Infinity },
    };

    render(<PlanUsageCard stats={proStats} plan="PRO" />);

    expect(screen.getByText(/unlimited/i)).toBeInTheDocument();
  });
});
```

**Implémentation:**

- [ ] Create `components/dashboard/PlanUsageCard.tsx`
- [ ] Progress bars for each resource
- [ ] Show current/limit
- [ ] Upgrade CTA if near limit
- [ ] Run test: `npm test -- PlanUsageCard.test.tsx`
- [ ] Commit: "feat: add PlanUsageCard component"

---

### Feature 1.8.3: Dashboard page

**Test:** Dashboard integrates components

```typescript
// apps/frontend/__tests__/pages/dashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import DashboardPage from '@/app/(dashboard)/dashboard/page';

describe('Dashboard Page', () => {
  it('should render plan usage card', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/plan usage/i)).toBeInTheDocument();
    });
  });

  it('should render recent articles', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/recent articles/i)).toBeInTheDocument();
    });
  });

  it('should render recent summaries', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/recent summaries/i)).toBeInTheDocument();
    });
  });

  it('should render recent notes', async () => {
    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/recent notes/i)).toBeInTheDocument();
    });
  });
});
```

**Implémentation:**

- [ ] Create `app/(dashboard)/dashboard/page.tsx`
- [ ] PlanUsageCard at top
- [ ] RecentArticles component (last 5)
- [ ] RecentSummaries component (last 3)
- [ ] RecentNotes component (last 5)
- [ ] Run test: `npm test -- dashboard.test.tsx`
- [ ] Commit: "feat: add dashboard page with overview"

---

## Sprint 1.9: Stripe Integration

### Feature 1.9.1: Verify Stripe routes work

**Test:** Stripe endpoints exist

```typescript
// apps/backend/src/__tests__/integration/stripe.test.ts (déjà dans boilerplate)
describe('Stripe API', () => {
  it('POST /api/stripe/create-checkout-session - works', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/stripe/create-checkout-session',
      headers: { authorization: `Bearer ${authToken}` },
      payload: {
        priceId: process.env.STRIPE_STARTER_PRICE_ID,
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toHaveProperty('sessionId')
  })
})
```

**Implémentation:**

- [ ] Verify existing Stripe routes work
- [ ] Update price IDs in .env (STARTER 6€, PRO 15€)
- [ ] Run test: `npm test -- stripe.test.ts`
- [ ] Commit: "test: verify Stripe integration works"

---

### Feature 1.9.2: Pricing page

**Test:** Pricing page renders

```typescript
// apps/frontend/__tests__/pages/pricing.test.tsx
import { render, screen } from '@testing-library/react';
import PricingPage from '@/app/(dashboard)/pricing/page';

describe('Pricing Page', () => {
  it('should render 3 plans', () => {
    render(<PricingPage />);

    expect(screen.getByText(/FREE/i)).toBeInTheDocument();
    expect(screen.getByText(/STARTER/i)).toBeInTheDocument();
    expect(screen.getByText(/PRO/i)).toBeInTheDocument();
  });

  it('should show plan features', () => {
    render(<PricingPage />);

    expect(screen.getByText(/10 articles/i)).toBeInTheDocument(); // FREE
    expect(screen.getByText(/50 articles/i)).toBeInTheDocument(); // STARTER
    expect(screen.getByText(/unlimited/i)).toBeInTheDocument(); // PRO
  });

  it('should show prices', () => {
    render(<PricingPage />);

    expect(screen.getByText(/6€/i)).toBeInTheDocument(); // STARTER
    expect(screen.getByText(/15€/i)).toBeInTheDocument(); // PRO
  });

  it('should have upgrade buttons', () => {
    render(<PricingPage />);

    const upgradeButtons = screen.getAllByRole('button', { name: /upgrade|subscribe/i });
    expect(upgradeButtons.length).toBeGreaterThanOrEqual(2);
  });
});
```

**Implémentation:**

- [ ] Create `app/(dashboard)/pricing/page.tsx`
- [ ] 3 plan cards (FREE, STARTER, PRO)
- [ ] Feature comparison
- [ ] Upgrade buttons
- [ ] Run test: `npm test -- pricing.test.tsx`
- [ ] Commit: "feat: add pricing page"

---

### Feature 1.9.3: Billing settings page

**Test:** Billing page works

```typescript
// apps/frontend/__tests__/pages/billing.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import BillingPage from '@/app/(dashboard)/settings/billing/page';

describe('Billing Page', () => {
  it('should show current plan', () => {
    render(<BillingPage />);

    expect(screen.getByText(/current plan/i)).toBeInTheDocument();
    expect(screen.getByText(/FREE|STARTER|PRO/i)).toBeInTheDocument();
  });

  it('should show manage subscription button for paid plans', () => {
    render(<BillingPage currentPlan="STARTER" />);

    expect(screen.getByRole('button', { name: /manage subscription/i })).toBeInTheDocument();
  });

  it('should show upgrade button for FREE plan', () => {
    render(<BillingPage currentPlan="FREE" />);

    expect(screen.getByRole('button', { name: /upgrade/i })).toBeInTheDocument();
  });
});
```

**Implémentation:**

- [ ] Create `app/(dashboard)/settings/billing/page.tsx`
- [ ] Show current plan
- [ ] "Manage Subscription" button (Stripe portal)
- [ ] "Upgrade" button for FREE users
- [ ] Run test: `npm test -- billing.test.tsx`
- [ ] Commit: "feat: add billing settings page"

---

## 📝 Checklist complète

**Total: ~60 features**

✅ **Sprint 0** (4 features) - Setup
✅ **Sprint 1.1** (3 features) - Auth & User
✅ **Sprint 1.2** (9 features) - Veille IA Backend
✅ **Sprint 1.3** (7 features) - Veille IA Frontend
✅ **Sprint 1.4** (8 features) - PowerPost Backend
✅ **Sprint 1.5** (6 features) - PowerPost Frontend
✅ **Sprint 1.6** (3 features) - PowerNote Backend
✅ **Sprint 1.7** (4 features) - PowerNote Frontend
✅ **Sprint 1.8** (3 features) - Dashboard
✅ **Sprint 1.9** (3 features) - Stripe

**Total Sprint 0-1: ~50 features (MVP Core)**

---

## Continuer avec Phase 2 & 3?

Voulez-vous que je continue à détailler **Phase 2 (Enrichissement)** et **Phase 3 (Polish & Launch)** avec le même format TDD feature par feature?

Cela ajouterait environ 30-40 features supplémentaires:

- Posts publics
- URLs web pour PowerPost
- Export PDF/Markdown
- Landing page
- Tests E2E
- etc.

Ou voulez-vous **commencer à coder maintenant** avec Feature 0.1?

---

**Document créé:** 2025-10-20
**Dernière mise à jour:** 2025-10-20
**Version:** 2.0 - COMPLET Sprint 0-1 (MVP Core)
**Approche:** TDD strict - Test → Feature → Commit → Repeat
