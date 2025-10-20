# NoteFlow - Architecture Technique

## Vue d'ensemble

NoteFlow utilise une architecture monorepo basée sur le boilerplate fullstack TypeScript, adaptée pour supporter les fonctionnalités de veille IA, résumés intelligents et prise de notes collaborative.

---

## 1. Architecture globale

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Veille IA   │  │  PowerPost   │  │  PowerNote   │      │
│  │   (Articles)  │  │  (Résumés)   │  │   (Notes)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         TanStack Query (Cache + State)                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓ REST API
┌─────────────────────────────────────────────────────────────┐
│                      Backend (Fastify)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Articles    │  │   Summaries   │  │    Notes     │      │
│  │  Controller   │  │  Controller   │  │  Controller  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Services Layer                           │  │
│  │  - ArticleService  - SummaryService  - NoteService   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │               Middlewares                             │  │
│  │  - Auth  - RBAC  - Plan Limits  - CSRF  - Rate Limit │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL   │  │    Redis      │  │   BullMQ     │      │
│  │  (Prisma)     │  │  (Cache)      │  │  (Queue)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    External Services                         │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  OpenAI API   │  │    Stripe     │  │   Resend     │      │
│  │  (Résumés)    │  │  (Paiements)  │  │  (Emails)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Structure du monorepo

```
noteflow/
├── apps/
│   ├── backend/                 # API Fastify
│   │   ├── src/
│   │   │   ├── config/          # Configuration (env, DB, Redis)
│   │   │   ├── controllers/     # Controllers REST
│   │   │   │   ├── article.controller.ts
│   │   │   │   ├── summary.controller.ts
│   │   │   │   ├── note.controller.ts
│   │   │   │   └── post.controller.ts
│   │   │   ├── services/        # Business logic
│   │   │   │   ├── article.service.ts
│   │   │   │   ├── rss.service.ts
│   │   │   │   ├── summary.service.ts
│   │   │   │   ├── ai.service.ts         # OpenAI/Claude
│   │   │   │   ├── note.service.ts
│   │   │   │   └── post.service.ts
│   │   │   ├── queues/          # BullMQ jobs
│   │   │   │   ├── summary.queue.ts      # Queue résumés IA
│   │   │   │   ├── summary.worker.ts     # Worker résumés
│   │   │   │   └── rss.queue.ts          # Queue fetch RSS
│   │   │   ├── middlewares/     # Middlewares
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── plan-limit.middleware.ts  # Vérif limites
│   │   │   │   └── rate-limit.middleware.ts
│   │   │   ├── schemas/         # Zod validation
│   │   │   │   ├── article.schema.ts
│   │   │   │   ├── summary.schema.ts
│   │   │   │   └── note.schema.ts
│   │   │   ├── routes/          # Routes API
│   │   │   │   ├── article.routes.ts
│   │   │   │   ├── summary.routes.ts
│   │   │   │   ├── note.routes.ts
│   │   │   │   └── post.routes.ts
│   │   │   ├── utils/           # Helpers
│   │   │   │   ├── logger.ts
│   │   │   │   ├── errors.ts
│   │   │   │   └── pdf-parser.ts         # Parse PDF
│   │   │   └── __tests__/       # Tests
│   │   ├── prisma/
│   │   │   └── schema.prisma    # Schema DB
│   │   └── Dockerfile
│   │
│   ├── frontend/                # Next.js App
│   │   ├── app/
│   │   │   ├── (auth)/          # Routes publiques
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── (dashboard)/     # Routes protégées
│   │   │   │   ├── dashboard/
│   │   │   │   ├── veille/      # Veille IA
│   │   │   │   ├── summaries/   # PowerPost
│   │   │   │   ├── notes/       # PowerNote
│   │   │   │   ├── posts/       # Posts publics
│   │   │   │   └── settings/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── veille/
│   │   │   │   ├── ArticleCard.tsx
│   │   │   │   ├── ArticleList.tsx
│   │   │   │   └── ArticleFilters.tsx
│   │   │   ├── summaries/
│   │   │   │   ├── SummaryForm.tsx      # Upload + style
│   │   │   │   ├── SummaryDisplay.tsx
│   │   │   │   └── StyleSelector.tsx    # 6 styles
│   │   │   ├── notes/
│   │   │   │   ├── NoteEditor.tsx       # Markdown editor
│   │   │   │   ├── NoteList.tsx
│   │   │   │   └── NoteToPostButton.tsx # Transformer → post
│   │   │   ├── posts/
│   │   │   │   ├── PostCard.tsx
│   │   │   │   └── PostFeed.tsx
│   │   │   └── ui/              # shadcn/ui components
│   │   ├── lib/
│   │   │   ├── api/             # API client
│   │   │   │   ├── articles.ts
│   │   │   │   ├── summaries.ts
│   │   │   │   ├── notes.ts
│   │   │   │   └── posts.ts
│   │   │   ├── hooks/           # Custom hooks
│   │   │   │   ├── useArticles.ts
│   │   │   │   ├── useSummaries.ts
│   │   │   │   └── useNotes.ts
│   │   │   └── i18n/            # Internationalization
│   │   │       ├── config.ts
│   │   │       ├── fr.json
│   │   │       └── en.json
│   │   ├── providers/
│   │   │   ├── AuthProvider.tsx
│   │   │   ├── QueryProvider.tsx
│   │   │   └── I18nProvider.tsx
│   │   └── Dockerfile
│   │
│   └── landing/                 # Landing page (marketing)
│       ├── app/
│       │   ├── page.tsx         # Homepage
│       │   ├── pricing/
│       │   └── features/
│       └── components/
│           ├── Hero.tsx
│           ├── Features.tsx
│           ├── Pricing.tsx
│           └── FAQ.tsx
│
├── packages/
│   ├── eslint-config/           # Shared ESLint
│   └── tsconfig/                # Shared TS configs
│
├── docker-compose.yml           # Dev environment
├── docker-compose.prod.yml      # Production
└── turbo.json                   # Turborepo config
```

---

## 3. Backend - Détails techniques

### 3.1 Services principaux

#### ArticleService
```typescript
class ArticleService {
  // Fetch articles from RSS feeds
  async fetchFromRSS(sources: string[]): Promise<Article[]>

  // Save article to user favorites
  async saveArticle(userId: string, articleId: string): Promise<void>

  // Get user saved articles
  async getUserArticles(userId: string, filters: Filters): Promise<Article[]>

  // Check if user can save more articles (plan limits)
  async canSaveArticle(userId: string): Promise<boolean>
}
```

#### RSSService
```typescript
class RSSService {
  // Parse RSS feed
  async parseFeed(url: string): Promise<RSSItem[]>

  // Validate RSS feed format
  async validateFeed(url: string): Promise<boolean>

  // Scheduled job: fetch all active feeds
  async fetchAllFeeds(): Promise<void>
}
```

#### SummaryService
```typescript
class SummaryService {
  // Create summary job (async)
  async createSummary(
    userId: string,
    text: string,
    style: SummaryStyle,
    source?: string
  ): Promise<{ jobId: string }>

  // Get summary status
  async getSummaryStatus(jobId: string): Promise<JobStatus>

  // Get user summaries
  async getUserSummaries(userId: string): Promise<Summary[]>

  // Check if user can generate summary (plan limits)
  async canGenerateSummary(userId: string): Promise<boolean>
}
```

#### AIService
```typescript
class AIService {
  // Generate summary with OpenAI/Claude
  async generateSummary(
    text: string,
    style: SummaryStyle,
    language: 'fr' | 'en'
  ): Promise<string>

  // Extract text from PDF
  async extractTextFromPDF(buffer: Buffer): Promise<string>

  // Fetch and extract text from URL
  async extractTextFromURL(url: string): Promise<string>
}
```

#### NoteService
```typescript
class NoteService {
  // CRUD operations
  async createNote(userId: string, data: NoteData): Promise<Note>
  async updateNote(noteId: string, data: Partial<NoteData>): Promise<Note>
  async deleteNote(noteId: string): Promise<void>
  async getNote(noteId: string): Promise<Note>
  async getUserNotes(userId: string, filters: Filters): Promise<Note[]>

  // Search notes (full-text)
  async searchNotes(userId: string, query: string): Promise<Note[]>

  // Transform note to public post
  async convertToPost(noteId: string): Promise<Post>

  // Check limits
  async canCreateNote(userId: string): Promise<boolean>
}
```

#### PostService
```typescript
class PostService {
  // Publish post
  async publishPost(userId: string, data: PostData): Promise<Post>

  // Get public feed
  async getPublicFeed(filters: Filters): Promise<Post[]>

  // Get user posts
  async getUserPosts(userId: string): Promise<Post[]>

  // Track views
  async incrementViews(postId: string): Promise<void>
}
```

---

### 3.2 Queues BullMQ

#### Summary Queue
```typescript
// queues/summary.queue.ts
export const summaryQueue = new Queue('summary', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});

// Job data
interface SummaryJobData {
  userId: string;
  text: string;
  style: SummaryStyle;
  language: 'fr' | 'en';
  source?: string;
}

// Add job
await summaryQueue.add('generate-summary', jobData);
```

#### Summary Worker
```typescript
// queues/summary.worker.ts
const worker = new Worker(
  'summary',
  async (job: Job<SummaryJobData>) => {
    const { userId, text, style, language, source } = job.data;

    // Generate summary with AI
    const summaryText = await aiService.generateSummary(text, style, language);

    // Save to DB
    await prisma.summary.create({
      data: {
        userId,
        originalText: text,
        summaryText,
        style,
        source,
      },
    });

    // Emit event (for real-time updates)
    eventEmitter.emit('summary:completed', { userId, jobId: job.id });

    return { success: true };
  },
  { connection: redisConnection }
);
```

#### RSS Queue (Cron job)
```typescript
// queues/rss.queue.ts
export const rssQueue = new Queue('rss', {
  connection: redisConnection,
});

// Cron: every hour
await rssQueue.add(
  'fetch-feeds',
  {},
  {
    repeat: {
      pattern: '0 * * * *', // Every hour
    },
  }
);

// Worker
const worker = new Worker('rss', async () => {
  const feeds = await prisma.rSSFeed.findMany({ where: { active: true } });

  for (const feed of feeds) {
    const articles = await rssService.parseFeed(feed.url);

    // Upsert articles
    for (const article of articles) {
      await prisma.article.upsert({
        where: { url: article.url },
        update: {},
        create: {
          title: article.title,
          url: article.url,
          excerpt: article.excerpt,
          source: feed.name,
          tags: article.tags,
          publishedAt: article.publishedAt,
        },
      });
    }
  }
});
```

---

### 3.3 Middlewares

#### Plan Limits Middleware
```typescript
// middlewares/plan-limit.middleware.ts
export const checkPlanLimit = (resource: 'articles' | 'summaries' | 'notes') => {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = req.user; // from auth middleware

    const limits = {
      FREE: { articles: 10, summaries: 5, notes: 20 },
      STARTER: { articles: 50, summaries: 20, notes: 100 },
      PRO: { articles: Infinity, summaries: Infinity, notes: Infinity },
    };

    const userLimit = limits[user.plan][resource];

    // Count user resources
    let count = 0;
    if (resource === 'articles') {
      count = await prisma.savedArticle.count({ where: { userId: user.id } });
    } else if (resource === 'summaries') {
      // Count summaries created this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      count = await prisma.summary.count({
        where: {
          userId: user.id,
          createdAt: { gte: startOfMonth },
        },
      });
    } else if (resource === 'notes') {
      count = await prisma.note.count({ where: { userId: user.id } });
    }

    if (count >= userLimit) {
      return reply.code(403).send({
        error: 'Plan limit reached',
        message: `You have reached your ${user.plan} plan limit for ${resource}`,
        limit: userLimit,
        current: count,
        upgrade: user.plan !== 'PRO',
      });
    }
  };
};

// Usage in routes
fastify.post(
  '/api/summaries',
  {
    preHandler: [authenticateUser, checkPlanLimit('summaries')],
  },
  summaryController.create
);
```

---

## 4. Frontend - Détails techniques

### 4.1 Structure des pages

#### Dashboard (vue d'ensemble)
```typescript
// app/(dashboard)/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div className="grid gap-6">
      {/* Stats cards */}
      <StatsCards />

      {/* Recent articles */}
      <RecentArticles limit={5} />

      {/* Recent summaries */}
      <RecentSummaries limit={3} />

      {/* Recent notes */}
      <RecentNotes limit={5} />

      {/* Plan usage */}
      <PlanUsageCard />
    </div>
  );
}
```

#### Veille IA
```typescript
// app/(dashboard)/veille/page.tsx
export default function VeillePage() {
  const [filters, setFilters] = useState({ source: 'all', tags: [] });
  const { data: articles } = useArticles(filters);

  return (
    <div>
      <ArticleFilters filters={filters} onChange={setFilters} />
      <ArticleList articles={articles} />
    </div>
  );
}
```

#### PowerPost (Résumés)
```typescript
// app/(dashboard)/summaries/page.tsx
export default function SummariesPage() {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Left: Create new summary */}
      <div>
        <SummaryForm />
      </div>

      {/* Right: History */}
      <div>
        <SummaryHistory />
      </div>
    </div>
  );
}

// components/summaries/SummaryForm.tsx
function SummaryForm() {
  const [source, setSource] = useState<'text' | 'pdf' | 'url'>('text');
  const [style, setStyle] = useState<SummaryStyle>('SHORT');
  const createSummary = useCreateSummary();

  return (
    <form onSubmit={handleSubmit}>
      {/* Source selector */}
      <SourceSelector value={source} onChange={setSource} />

      {/* Input based on source */}
      {source === 'text' && <Textarea />}
      {source === 'pdf' && <FileUpload accept=".pdf" />}
      {source === 'url' && <Input type="url" />}

      {/* Style selector (6 styles) */}
      <StyleSelector value={style} onChange={setStyle} />

      <Button type="submit">Générer résumé</Button>
    </form>
  );
}
```

#### PowerNote
```typescript
// app/(dashboard)/notes/page.tsx
export default function NotesPage() {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Sidebar */}
      <div>
        <NoteSidebar />
      </div>

      {/* Middle: Note list */}
      <div>
        <NoteList />
      </div>

      {/* Right: Editor */}
      <div className="col-span-1">
        <NoteEditor />
      </div>
    </div>
  );
}
```

---

### 4.2 TanStack Query hooks

```typescript
// lib/hooks/useArticles.ts
export function useArticles(filters: ArticleFilters) {
  return useQuery({
    queryKey: ['articles', filters],
    queryFn: () => api.articles.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSaveArticle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (articleId: string) => api.articles.save(articleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}

// lib/hooks/useSummaries.ts
export function useCreateSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSummaryData) => api.summaries.create(data),
    onSuccess: (jobId) => {
      // Start polling for job status
      queryClient.invalidateQueries({ queryKey: ['summaries'] });
    },
  });
}

export function useSummaryStatus(jobId: string) {
  return useQuery({
    queryKey: ['summary-status', jobId],
    queryFn: () => api.summaries.getStatus(jobId),
    refetchInterval: (data) => {
      // Poll every 2s if pending, stop if completed/failed
      return data?.status === 'pending' ? 2000 : false;
    },
  });
}

// lib/hooks/useNotes.ts
export function useNotes(filters: NoteFilters) {
  return useQuery({
    queryKey: ['notes', filters],
    queryFn: () => api.notes.getAll(filters),
  });
}

export function useConvertNoteToPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (noteId: string) => api.notes.convertToPost(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });
}
```

---

## 5. Base de données (Prisma Schema complet)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============ AUTH ============

model User {
  id                String    @id @default(cuid())
  email             String    @unique
  password          String?   // null if OAuth
  name              String?
  role              Role      @default(USER)
  plan              Plan      @default(FREE)
  stripeCustomerId  String?   @unique
  emailVerified     Boolean   @default(false)
  language          String    @default("fr") // fr | en

  // Relations
  savedArticles     SavedArticle[]
  summaries         Summary[]
  notes             Note[]
  posts             Post[]
  refreshTokens     RefreshToken[]
  proposedFeeds     RSSFeedProposal[]

  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}

enum Role {
  USER
  ADMIN
}

enum Plan {
  FREE
  STARTER
  PRO
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

// ============ VEILLE IA ============

model RSSFeed {
  id          String    @id @default(cuid())
  name        String
  url         String    @unique
  category    String    // "dev", "ai", "tech"
  active      Boolean   @default(true)
  lastFetchAt DateTime?

  articles    Article[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model RSSFeedProposal {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  url       String
  category  String
  status    ProposalStatus @default(PENDING)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum ProposalStatus {
  PENDING
  APPROVED
  REJECTED
}

model Article {
  id          String   @id @default(cuid())
  title       String
  url         String   @unique
  excerpt     String?  @db.Text
  source      String
  tags        String[]
  publishedAt DateTime

  feedId      String
  feed        RSSFeed  @relation(fields: [feedId], references: [id], onDelete: Cascade)

  savedBy     SavedArticle[]

  createdAt   DateTime @default(now())

  @@index([publishedAt(sort: Desc)])
  @@index([source])
}

model SavedArticle {
  id        String   @id @default(cuid())
  userId    String
  articleId String

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  article   Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([userId, articleId])
  @@index([userId])
}

// ============ POWERPOST (Résumés IA) ============

model Summary {
  id           String        @id @default(cuid())
  userId       String
  title        String?
  originalText String        @db.Text
  summaryText  String        @db.Text
  style        SummaryStyle
  source       String?       // URL or filename
  language     String        @default("fr")

  user         User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt    DateTime      @default(now())

  @@index([userId])
  @@index([createdAt(sort: Desc)])
}

enum SummaryStyle {
  SHORT
  TWEET
  THREAD
  BULLET_POINT
  TOP3
  MAIN_POINTS
}

// ============ POWERNOTE (Notes) ============

model Note {
  id        String   @id @default(cuid())
  userId    String
  title     String
  content   String   @db.Text
  tags      String[]
  folder    String?

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([updatedAt(sort: Desc)])
}

// ============ POSTS PUBLICS ============

model Post {
  id        String   @id @default(cuid())
  userId    String
  title     String
  content   String   @db.Text
  tags      String[]
  published Boolean  @default(true)
  views     Int      @default(0)

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([createdAt(sort: Desc)])
  @@index([published])
}
```

---

## 6. APIs externes

### 6.1 OpenAI Integration

```typescript
// services/ai.service.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class AIService {
  async generateSummary(
    text: string,
    style: SummaryStyle,
    language: 'fr' | 'en'
  ): Promise<string> {
    const prompts = {
      SHORT: {
        fr: 'Résume ce texte en 2-3 phrases courtes et claires.',
        en: 'Summarize this text in 2-3 short and clear sentences.',
      },
      TWEET: {
        fr: 'Résume ce texte en un tweet de 280 caractères maximum.',
        en: 'Summarize this text in a tweet of maximum 280 characters.',
      },
      THREAD: {
        fr: 'Crée un thread Twitter (5-7 tweets) résumant les points clés.',
        en: 'Create a Twitter thread (5-7 tweets) summarizing key points.',
      },
      BULLET_POINT: {
        fr: 'Liste les points clés sous forme de bullet points (5-8 points).',
        en: 'List key points as bullet points (5-8 points).',
      },
      TOP3: {
        fr: 'Extrais les 3 points les plus importants.',
        en: 'Extract the 3 most important points.',
      },
      MAIN_POINTS: {
        fr: 'Résume les points principaux de manière détaillée.',
        en: 'Summarize main points in detail.',
      },
    };

    const systemPrompt = prompts[style][language];

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.7,
      max_tokens: style === 'TWEET' ? 100 : 500,
    });

    return response.choices[0].message.content || '';
  }

  async extractTextFromPDF(buffer: Buffer): Promise<string> {
    // Use pdf-parse or similar library
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return data.text;
  }

  async extractTextFromURL(url: string): Promise<string> {
    // Use cheerio or puppeteer
    const cheerio = require('cheerio');
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, etc.
    $('script, style, nav, footer, header').remove();

    // Extract main content (adjust selectors as needed)
    const text = $('article, main, .content, .post').text();

    return text.trim();
  }
}
```

### 6.2 RSS Parsing

```typescript
// services/rss.service.ts
import Parser from 'rss-parser';

const parser = new Parser();

export class RSSService {
  async parseFeed(url: string): Promise<RSSItem[]> {
    try {
      const feed = await parser.parseURL(url);

      return feed.items.map((item) => ({
        title: item.title || '',
        url: item.link || '',
        excerpt: this.cleanExcerpt(item.contentSnippet || item.content || ''),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        tags: item.categories || [],
      }));
    } catch (error) {
      logger.error('RSS parse error', { url, error });
      throw error;
    }
  }

  private cleanExcerpt(text: string, maxLength = 300): string {
    // Remove HTML tags
    const clean = text.replace(/<[^>]*>/g, '');

    // Truncate
    if (clean.length > maxLength) {
      return clean.substring(0, maxLength) + '...';
    }

    return clean;
  }

  async validateFeed(url: string): Promise<boolean> {
    try {
      await parser.parseURL(url);
      return true;
    } catch {
      return false;
    }
  }
}
```

---

## 7. Internationalisation (i18n)

### 7.1 Configuration

```typescript
// lib/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';
import en from './en.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: 'fr',
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

### 7.2 Traductions

```json
// lib/i18n/fr.json
{
  "nav": {
    "dashboard": "Tableau de bord",
    "veille": "Veille IA",
    "summaries": "Résumés",
    "notes": "Notes",
    "posts": "Posts publics"
  },
  "plans": {
    "free": "Gratuit",
    "starter": "Starter",
    "pro": "Pro"
  },
  "summaries": {
    "styles": {
      "short": "Court",
      "tweet": "Tweet",
      "thread": "Thread",
      "bullet": "Points clés",
      "top3": "Top 3",
      "main": "Détaillé"
    }
  }
}
```

```json
// lib/i18n/en.json
{
  "nav": {
    "dashboard": "Dashboard",
    "veille": "AI Watch",
    "summaries": "Summaries",
    "notes": "Notes",
    "posts": "Public Posts"
  },
  "plans": {
    "free": "Free",
    "starter": "Starter",
    "pro": "Pro"
  },
  "summaries": {
    "styles": {
      "short": "Short",
      "tweet": "Tweet",
      "thread": "Thread",
      "bullet": "Bullet Points",
      "top3": "Top 3",
      "main": "Detailed"
    }
  }
}
```

---

## 8. Déploiement

### 8.1 Variables d'environnement

```env
# Backend
DATABASE_URL="postgresql://user:pass@localhost:5432/noteflow"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."

# OpenAI
OPENAI_API_KEY="sk-..."

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_PUBLISHABLE_KEY="pk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email
RESEND_API_KEY="re_..."
EMAIL_FROM="noreply@noteflow.app"

# Sentry
SENTRY_DSN="https://...@sentry.io/..."

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."
```

### 8.2 Docker Production

Utiliser `docker-compose.prod.yml` du boilerplate avec les services NoteFlow.

---

## 9. Performance & Optimisations

### 9.1 Caching Strategy

```typescript
// Redis cache for articles
const CACHE_TTL = 60 * 60; // 1 hour

// Cache articles list
const cacheKey = `articles:${filters}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const articles = await prisma.article.findMany();
await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(articles));

return articles;
```

### 9.2 Database Indexes

Voir Prisma schema - indexes déjà définis sur:
- `Article.publishedAt`
- `Article.source`
- `SavedArticle.userId`
- `Summary.userId`
- `Summary.createdAt`
- `Note.userId`
- `Note.updatedAt`
- `Post.userId`
- `Post.createdAt`
- `Post.published`

### 9.3 Rate Limiting

```typescript
// Protect AI endpoints
fastify.post('/api/summaries', {
  config: {
    rateLimit: {
      max: 10, // 10 requests
      timeWindow: '1 minute',
    },
  },
}, handler);
```

---

## 10. Monitoring & Logging

### Sentry Integration
- Déjà configuré dans le boilerplate
- Capturer erreurs AI service
- Monitoring jobs BullMQ

### Custom Metrics
```typescript
// Track AI usage costs
logger.info('AI summary generated', {
  userId,
  style,
  tokensUsed: response.usage.total_tokens,
  cost: calculateCost(response.usage.total_tokens),
});
```

---

**Document créé:** 2025-10-20
**Dernière mise à jour:** 2025-10-20
**Version:** 1.0
