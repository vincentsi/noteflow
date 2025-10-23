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

### AI Watch (Veille IA)
- Automated RSS feed monitoring (dev/AI sources)
- Filter by source, tags, date
- Save favorite articles
- Plan-based limits (FREE: 10, STARTER: 50, PRO: unlimited)

### PowerPost (AI Summaries)
- Support for text, PDF, and web URLs
- 6 summary styles powered by OpenAI (SHORT, TWEET, THREAD, BULLET_POINT, TOP3, MAIN_POINTS)
- Async processing with BullMQ
- Monthly limits (FREE: 5, STARTER: 20, PRO: unlimited)

### PowerNote
- Markdown editor with live preview
- Tag-based organization
- Create, edit, delete notes
- Plan-based limits (FREE: 20, STARTER: 100, PRO: unlimited)

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

## Pricing Plans

| Plan | Price | Articles | Summaries/month | Notes |
|------|-------|----------|-----------------|-------|
| **FREE** | 0€ | 10 | 5 | 20 |
| **STARTER** | 6€/month | 50 | 20 | 100 |
| **PRO** | 15€/month | Unlimited | Unlimited | Unlimited |

---

**Built with TypeScript + Next.js + Fastify** | **MVP Complete** 🚀
