# NoteFlow

> AI-powered platform for developers combining AI Watch, intelligent summaries, and collaborative note-taking.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What is NoteFlow?

NoteFlow is a comprehensive platform designed for developers that combines:

- **AI Watch (Veille IA)** - Automated RSS feed aggregation for dev/AI content
- **PowerPost** - AI-powered content summarization with 6 styles (SHORT, TWEET, THREAD, BULLET_POINT, TOP3, MAIN_POINTS)
- **PowerNote** - Markdown-based note-taking with the ability to publish notes publicly

## Features

### AI Watch
- Automated RSS feed monitoring (dev/AI sources)
- Filter by source, tags, date
- Save favorite articles
- Plan-based limits (FREE: 10, STARTER: 50, PRO: unlimited)

### PowerPost (AI Summaries)
- Support for text, PDF, and web URLs
- 6 summary styles powered by OpenAI
- Async processing with BullMQ
- Monthly limits (FREE: 5, STARTER: 20, PRO: unlimited)

### PowerNote
- Markdown editor with live preview
- Tag-based organization
- Full-text search
- Convert notes to public posts
- Export to Markdown/PDF (STARTER+)

## Tech Stack

**Backend:**
- Fastify 5.x - High-performance API
- Prisma 6.x - Type-safe ORM
- PostgreSQL 16 - Database
- Redis 7 - Caching & queues
- BullMQ - Job queue system
- OpenAI - AI summaries

**Frontend:**
- Next.js 15 - React framework
- TanStack Query - Server state
- Tailwind CSS 4 - Styling
- shadcn/ui - UI components
- React Hook Form + Zod - Forms

**DevOps:**
- Turborepo - Monorepo build system
- Docker - Containerization
- GitHub Actions - CI/CD

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- OpenAI API key

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
cd apps/backend
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Start development servers
cd ../..
npm run dev
```

**Servers:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Landing: http://localhost:3002

### Docker Setup

```bash
# Generate JWT secrets
openssl rand -hex 64  # For JWT_SECRET
openssl rand -hex 64  # For JWT_REFRESH_SECRET

# Create .env file with secrets
cat > .env << EOF
JWT_SECRET=your_generated_secret_here
JWT_REFRESH_SECRET=your_generated_refresh_secret_here
EOF

# Start all services
docker-compose up -d
```

## Project Structure

```
noteflow/
├── apps/
│   ├── backend/              # Fastify API
│   ├── frontend/             # Next.js App
│   └── landing/              # Marketing site
├── packages/
│   ├── eslint-config/        # Shared ESLint
│   └── tsconfig/             # Shared TS configs
├── plan/                     # Project planning docs
│   ├── INDEX.md              # Documentation guide
│   ├── MVP-PLAN.md           # Product overview
│   ├── ARCHITECTURE.md       # Technical architecture
│   ├── ROADMAP.md            # Project roadmap
│   ├── TDD-WORKFLOW.md       # Feature-by-feature workflow
│   └── TESTING-STRATEGY.md   # Testing approach
└── docker-compose.yml
```

## Pricing Plans

| Plan | Price | Articles | Summaries/month | Notes | Features |
|------|-------|----------|-----------------|-------|----------|
| **FREE** | 0€ | 10 | 5 | 20 | Basic features |
| **STARTER** | 6€/month | 50 | 20 | 100 | + Export MD, AI on notes |
| **PRO** | 15€/month | Unlimited | Unlimited | Unlimited | + Export PDF, Propose RSS feeds |

## Documentation

See the [plan/](plan/) directory for complete project documentation:

- **[INDEX.md](plan/INDEX.md)** - Documentation guide
- **[MVP-PLAN.md](plan/MVP-PLAN.md)** - Complete product overview
- **[ARCHITECTURE.md](plan/ARCHITECTURE.md)** - Technical architecture
- **[TDD-WORKFLOW.md](plan/TDD-WORKFLOW.md)** - Development workflow (50+ features)
- **[TESTING-STRATEGY.md](plan/TESTING-STRATEGY.md)** - Testing approach

## Development

This project follows **Test-Driven Development (TDD)**. See [TDD-WORKFLOW.md](plan/TDD-WORKFLOW.md) for the complete feature-by-feature workflow.

### Scripts

```bash
# Development
npm run dev          # Start all apps
npm run build        # Build all apps
npm run lint         # Lint all packages
npm run type-check   # TypeScript check
npm test             # Run all tests

# Backend specific
cd apps/backend
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
npm test             # Run tests with coverage
```

## License

MIT License - see [LICENSE](LICENSE) file for details

## Author

Vincent SI - vincent.si.dev@gmail.com

---

**Built with the fullstack TypeScript boilerplate** | **In active development** 🚀
