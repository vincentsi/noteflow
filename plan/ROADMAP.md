# NoteFlow - Roadmap de développement

## Vue d'ensemble

Ce roadmap détaille les sprints de développement pour NoteFlow, de l'initialisation du projet jusqu'au lancement public.

**Durée estimée totale:** 8-10 semaines
**Méthodologie:** Agile avec sprints de 1-2 semaines

---

## Phase 0: Setup & Configuration (Semaine 1)

### Sprint 0.1: Initialisation projet
**Durée:** 2-3 jours

- [ ] Nettoyer le boilerplate (supprimer exemples non utilisés)
- [ ] Renommer projet → NoteFlow
- [ ] Configurer variables d'environnement
- [ ] Setup PostgreSQL + Redis (local + Docker)
- [ ] Vérifier que tout build correctement

**Livrables:**
- Projet compilable et démarrable
- Docker compose fonctionnel
- Base de données accessible

---

### Sprint 0.2: Schema DB & i18n
**Durée:** 2-3 jours

- [ ] Créer Prisma schema complet (voir ARCHITECTURE.md)
- [ ] Générer migrations initiales
- [ ] Seed DB avec données de test
- [ ] Setup i18n (next-i18next)
- [ ] Créer fichiers traduction FR/EN de base
- [ ] Configurer Stripe products (FREE/STARTER/PRO)

**Livrables:**
- Schema DB complet et migré
- Données de test disponibles
- i18n fonctionnel (FR/EN)
- Stripe configuré avec 3 plans

---

## Phase 1: MVP Core (Semaines 2-5)

### Sprint 1.1: Auth & User Management
**Durée:** 1 semaine

**Backend:**
- [ ] Adapter auth du boilerplate pour NoteFlow
- [ ] Ajouter champ `language` au User model
- [ ] Endpoint: `PATCH /api/users/me` (update profile + language)
- [ ] Tests auth

**Frontend:**
- [ ] Pages login/register (déjà dans boilerplate)
- [ ] Page settings avec sélecteur langue
- [ ] Afficher plan utilisateur dans header
- [ ] AuthProvider avec langue

**Livrables:**
- Auth complète (email + Google)
- Gestion profil utilisateur
- Sélection langue FR/EN

---

### Sprint 1.2: Veille IA - Backend
**Durée:** 1 semaine

**Backend:**
- [ ] Model: `RSSFeed`, `Article`, `SavedArticle`
- [ ] Service: `RSSService` (parse feeds)
- [ ] Service: `ArticleService` (CRUD, filters)
- [ ] Queue: `rss.queue.ts` (cron fetch every hour)
- [ ] Worker: `rss.worker.ts`
- [ ] Routes:
  - `GET /api/articles` (list + filters)
  - `POST /api/articles/:id/save` (save article)
  - `DELETE /api/articles/:id/unsave`
  - `GET /api/articles/saved` (user saved articles)
- [ ] Middleware: `checkPlanLimit('articles')`
- [ ] Seed: 3-5 flux RSS (dev/IA)
- [ ] Tests

**Livrables:**
- Flux RSS automatique (cron)
- API articles complète
- Limites par plan appliquées

---

### Sprint 1.3: Veille IA - Frontend
**Durée:** 1 semaine

**Frontend:**
- [ ] Page: `/veille`
- [ ] Component: `ArticleCard` (titre, excerpt, source, date, CTA)
- [ ] Component: `ArticleList` (liste paginée)
- [ ] Component: `ArticleFilters` (source, tags, date)
- [ ] Hook: `useArticles(filters)`
- [ ] Hook: `useSaveArticle()`
- [ ] i18n: traductions veille
- [ ] Afficher limite plan (ex: "5/10 articles sauvegardés")

**Livrables:**
- Page veille fonctionnelle
- Filtres par source/tags
- Sauvegarde articles
- Affichage limites plan

---

### Sprint 1.4: PowerPost - Backend (Résumés IA)
**Durée:** 1-2 semaines

**Backend:**
- [ ] Model: `Summary`
- [ ] Service: `AIService` (OpenAI integration)
  - `generateSummary(text, style, language)`
  - `extractTextFromPDF(buffer)`
- [ ] Service: `SummaryService`
  - `createSummary()` → create job
  - `getSummaryStatus(jobId)`
  - `getUserSummaries()`
- [ ] Queue: `summary.queue.ts`
- [ ] Worker: `summary.worker.ts` (process AI summaries)
- [ ] Routes:
  - `POST /api/summaries` (create summary job)
  - `GET /api/summaries/:jobId/status`
  - `GET /api/summaries` (user summaries)
  - `DELETE /api/summaries/:id`
- [ ] Middleware: `checkPlanLimit('summaries')`
- [ ] Support: copier-coller texte + PDF
- [ ] Styles: SHORT, TWEET, THREAD, BULLET_POINT (4 styles pour MVP)
- [ ] Tests (mock OpenAI)

**Livrables:**
- Résumés IA async (BullMQ)
- Support texte + PDF
- 4 styles de résumé
- Limites mensuelles appliquées

---

### Sprint 1.5: PowerPost - Frontend
**Durée:** 1 semaine

**Frontend:**
- [ ] Page: `/summaries`
- [ ] Component: `SummaryForm`
  - Source selector (text, pdf)
  - Style selector (4 styles avec icônes)
  - File upload (PDF)
  - Textarea (copier-coller)
- [ ] Component: `SummaryDisplay` (afficher résumé + original)
- [ ] Component: `SummaryHistory` (liste résumés passés)
- [ ] Hook: `useCreateSummary()`
- [ ] Hook: `useSummaryStatus(jobId)` (polling)
- [ ] Loading state pendant génération
- [ ] Afficher limite plan (ex: "3/5 résumés ce mois")
- [ ] i18n: traductions summaries

**Livrables:**
- Page résumés fonctionnelle
- Upload PDF + copier-coller
- 4 styles sélectionnables
- Polling temps réel du statut
- Historique résumés

---

### Sprint 1.6: PowerNote - Backend
**Durée:** 1 semaine

**Backend:**
- [ ] Model: `Note`
- [ ] Service: `NoteService`
  - CRUD complet
  - `searchNotes(query)` (full-text search)
  - `getUserNotes(filters)`
- [ ] Routes:
  - `POST /api/notes` (create)
  - `GET /api/notes` (list + filters)
  - `GET /api/notes/:id`
  - `PATCH /api/notes/:id` (update)
  - `DELETE /api/notes/:id`
  - `GET /api/notes/search?q=...`
- [ ] Middleware: `checkPlanLimit('notes')`
- [ ] Tests

**Livrables:**
- CRUD notes complet
- Recherche full-text
- Limites par plan

---

### Sprint 1.7: PowerNote - Frontend
**Durée:** 1 semaine

**Frontend:**
- [ ] Page: `/notes`
- [ ] Component: `NoteSidebar` (liste notes, folders)
- [ ] Component: `NoteEditor` (Markdown editor simple)
  - Utiliser `react-markdown` + `react-simplemde-editor`
- [ ] Component: `NoteList` (liste + preview)
- [ ] Hook: `useNotes(filters)`
- [ ] Hook: `useCreateNote()`, `useUpdateNote()`, `useDeleteNote()`
- [ ] Search bar avec debounce
- [ ] Tags autocomplete
- [ ] Afficher limite plan
- [ ] i18n: traductions notes

**Livrables:**
- Page notes fonctionnelle
- Éditeur Markdown
- Recherche + tags
- CRUD complet

---

### Sprint 1.8: Dashboard & Plan Limits
**Durée:** 3-4 jours

**Backend:**
- [ ] Endpoint: `GET /api/users/stats` (plan usage stats)

**Frontend:**
- [ ] Page: `/dashboard`
- [ ] Component: `StatsCards` (articles, résumés, notes)
- [ ] Component: `PlanUsageCard` (barres progression)
- [ ] Component: `RecentArticles` (5 derniers)
- [ ] Component: `RecentSummaries` (3 derniers)
- [ ] Component: `RecentNotes` (5 dernières)
- [ ] CTA "Upgrade to PRO" si limites atteintes
- [ ] i18n: traductions dashboard

**Livrables:**
- Dashboard avec overview
- Stats d'utilisation visibles
- CTA upgrade

---

### Sprint 1.9: Stripe Integration
**Durée:** 3-4 jours

**Backend:**
- [ ] Adapter routes Stripe du boilerplate
- [ ] Configurer 3 plans: FREE (0€), STARTER (6€), PRO (15€)
- [ ] Webhook: sync plan sur événements Stripe
- [ ] Route: `POST /api/stripe/cancel-subscription`

**Frontend:**
- [ ] Page: `/pricing` (3 plans avec features)
- [ ] Page: `/settings/billing`
- [ ] Button: "Upgrade to STARTER/PRO"
- [ ] Stripe checkout flow
- [ ] Customer portal
- [ ] i18n: traductions pricing

**Livrables:**
- Paiements Stripe fonctionnels
- 3 plans configurés
- Sync automatique des abonnements

---

## Phase 2: Enrichissement (Semaines 6-7)

### Sprint 2.1: Posts publics
**Durée:** 1 semaine

**Backend:**
- [ ] Model: `Post`
- [ ] Service: `PostService`
  - `publishPost()`
  - `getPublicFeed(filters)`
  - `incrementViews()`
- [ ] Routes:
  - `POST /api/posts` (publish)
  - `GET /api/posts` (public feed)
  - `GET /api/posts/:id` (single post)
  - `DELETE /api/posts/:id` (own posts only)
- [ ] Limit: max 10 posts/mois pour STARTER
- [ ] Tests

**Frontend:**
- [ ] Page: `/posts` (feed public)
- [ ] Page: `/posts/[id]` (single post view)
- [ ] Component: `PostCard`
- [ ] Component: `PostFeed`
- [ ] Hook: `usePublicPosts()`
- [ ] i18n: traductions posts

**Livrables:**
- Feed public de posts
- Publier notes → posts
- Limites par plan

---

### Sprint 2.2: Transformer Note → Post
**Durée:** 2-3 jours

**Backend:**
- [ ] Service: `convertNoteToPost(noteId)`
- [ ] Route: `POST /api/notes/:id/publish`

**Frontend:**
- [ ] Button dans `NoteEditor`: "Publier en post public"
- [ ] Modal confirmation
- [ ] Hook: `useConvertNoteToPost()`

**Livrables:**
- Conversion note → post
- Confirmation utilisateur

---

### Sprint 2.3: PowerPost - URLs web + styles avancés
**Durée:** 1 semaine

**Backend:**
- [ ] `AIService.extractTextFromURL(url)`
  - Utiliser Cheerio ou Puppeteer
- [ ] Support 2 styles additionnels: TOP3, MAIN_POINTS
- [ ] Validation URL

**Frontend:**
- [ ] Option "URL" dans `SummaryForm`
- [ ] Input URL avec validation
- [ ] Support 6 styles complets
- [ ] Preview URL avant résumé

**Livrables:**
- Résumés depuis URLs web
- 6 styles de résumé complets

---

### Sprint 2.4: Export & Advanced Features
**Durée:** 3-4 jours

**Backend:**
- [ ] Export Markdown (notes)
- [ ] Export PDF (notes) - utiliser `jsPDF` ou `puppeteer`
- [ ] Route: `GET /api/notes/:id/export?format=md|pdf`

**Frontend:**
- [ ] Buttons export dans notes
- [ ] Download file client-side
- [ ] Grisé si pas STARTER/PRO

**Livrables:**
- Export Markdown (STARTER+)
- Export PDF (PRO)

---

### Sprint 2.5: Proposer sources RSS (PRO)
**Durée:** 2-3 jours

**Backend:**
- [ ] Model: `RSSFeedProposal`
- [ ] Routes:
  - `POST /api/feeds/propose` (PRO only)
  - `GET /api/admin/feeds/proposals` (ADMIN)
  - `POST /api/admin/feeds/proposals/:id/approve`
  - `POST /api/admin/feeds/proposals/:id/reject`

**Frontend:**
- [ ] Page: `/veille/propose` (PRO only)
- [ ] Form: nom, URL, catégorie
- [ ] Admin page: `/admin/feeds`

**Livrables:**
- Users PRO peuvent proposer sources
- Admin valide/rejette

---

### Sprint 2.6: Résumé IA sur notes (STARTER)
**Durée:** 2 jours

**Backend:**
- [ ] Route: `POST /api/notes/:id/summarize`
- [ ] Utilise même `AIService.generateSummary()`

**Frontend:**
- [ ] Button "Résumer avec IA" dans notes (STARTER+)
- [ ] Modal: sélection style
- [ ] Afficher résumé dans modal

**Livrables:**
- Résumé IA des notes pour STARTER/PRO

---

## Phase 3: Polish & Launch (Semaine 8)

### Sprint 3.1: Landing Page
**Durée:** 2-3 jours

**Frontend (apps/landing):**
- [ ] Hero section (CTA: "Essai gratuit")
- [ ] Features section (3 features principales)
- [ ] Pricing section (3 plans)
- [ ] FAQ section
- [ ] Footer (links, réseaux sociaux)
- [ ] i18n FR/EN
- [ ] SEO meta tags

**Livrables:**
- Landing page professionnelle
- SEO optimisé

---

### Sprint 3.2: Onboarding
**Durée:** 2 jours

**Frontend:**
- [ ] Modal onboarding (3 steps)
  - Step 1: Bienvenue + sélection langue
  - Step 2: Tour des features
  - Step 3: Créer 1er résumé
- [ ] Skip option
- [ ] Ne montrer qu'une fois (localStorage)

**Livrables:**
- Onboarding guidé pour nouveaux users

---

### Sprint 3.3: Email notifications
**Durée:** 2 jours

**Backend:**
- [ ] Template: "Résumé prêt" (quand job terminé)
- [ ] Template: "Veille hebdomadaire" (digest articles)
- [ ] Cron: envoi digest chaque lundi matin
- [ ] Settings: désactiver emails

**Frontend:**
- [ ] Page settings: préférences emails

**Livrables:**
- Emails transactionnels
- Digest hebdomadaire

---

### Sprint 3.4: Tests E2E & QA
**Durée:** 2-3 jours

**Tests:**
- [ ] E2E: Auth flow
- [ ] E2E: Veille IA (save/unsave articles)
- [ ] E2E: Créer résumé (mock OpenAI)
- [ ] E2E: CRUD notes
- [ ] E2E: Publier post
- [ ] E2E: Upgrade plan Stripe (test mode)
- [ ] E2E: Limites freemium

**QA:**
- [ ] Test i18n FR/EN complet
- [ ] Test responsive mobile
- [ ] Test limites plans
- [ ] Test erreurs (500, 404, etc.)

**Livrables:**
- Suite tests E2E complète
- Pas de bugs critiques

---

### Sprint 3.5: Performance & Optimizations
**Durée:** 2 jours

**Backend:**
- [ ] Optimiser queries DB (indexes)
- [ ] Cache Redis pour articles (TTL 1h)
- [ ] Rate limiting sur endpoints sensibles
- [ ] Monitoring Sentry configuré

**Frontend:**
- [ ] Next.js image optimization
- [ ] Lazy loading components
- [ ] Code splitting
- [ ] Lighthouse score 90+

**Livrables:**
- Performance optimisée
- Monitoring actif

---

### Sprint 3.6: Documentation
**Durée:** 1 jour

**Docs:**
- [ ] README.md principal (présentation projet)
- [ ] SETUP.md (guide installation)
- [ ] API.md (documentation API endpoints)
- [ ] CONTRIBUTING.md (si open-source)

**Livrables:**
- Documentation complète et à jour

---

### Sprint 3.7: Deployment Staging
**Durée:** 1 jour

**Infra:**
- [ ] Setup serveur staging (Vercel/Railway/DO)
- [ ] Deploy backend staging
- [ ] Deploy frontend staging
- [ ] Config DNS + SSL
- [ ] Variables env production
- [ ] Migrations DB auto

**Livrables:**
- Env staging accessible publiquement
- URL: staging.noteflow.app

---

### Sprint 3.8: Beta Testing
**Durée:** 3-5 jours

**Actions:**
- [ ] Inviter 10-20 bêta testeurs (devs)
- [ ] Créer questionnaire feedback
- [ ] Monitorer usage (Sentry, logs)
- [ ] Corriger bugs urgents
- [ ] Itérer selon feedback

**Livrables:**
- Feedback collecté
- Bugs critiques corrigés
- Améliorations prioritaires identifiées

---

### Sprint 3.9: Production Launch
**Durée:** 1-2 jours

**Infra:**
- [ ] Setup serveur production
- [ ] Deploy backend prod
- [ ] Deploy frontend prod
- [ ] Config DNS final (noteflow.app)
- [ ] SSL certificates
- [ ] Backups DB automatiques

**Communication:**
- [ ] Post Product Hunt
- [ ] Post Reddit (r/SideProject, r/webdev)
- [ ] Post Twitter/X
- [ ] Post LinkedIn
- [ ] Email beta testeurs

**Livrables:**
- NoteFlow en production publique
- Communication lancée

---

## Phase 4: Post-Launch (Semaines 9-10)

### Sprint 4.1: Analytics & Monitoring
**Durée:** 2-3 jours

**Backend:**
- [ ] Track events (Mixpanel/Posthog)
  - User signup
  - Summary created
  - Article saved
  - Note created
  - Post published
  - Plan upgraded
- [ ] Dashboard analytics

**Frontend:**
- [ ] Google Analytics
- [ ] Hotjar (heatmaps)

**Livrables:**
- Analytics complètes
- Funnel conversion trackable

---

### Sprint 4.2: Admin Dashboard
**Durée:** 3 jours

**Frontend:**
- [ ] Page: `/admin` (ADMIN only)
- [ ] Stats overview (users, summaries, revenue)
- [ ] Liste users (filtres, search)
- [ ] Valider proposals RSS
- [ ] Modérer posts publics

**Livrables:**
- Dashboard admin fonctionnel

---

### Sprint 4.3: Mobile App (React Native)
**Durée:** 2-3 semaines (Phase longue)

**Setup:**
- [ ] Init React Native / Expo
- [ ] Auth avec JWT (sync backend)
- [ ] Navigation (React Navigation)

**Features:**
- [ ] Écran: Feed veille IA
- [ ] Écran: Liste résumés
- [ ] Écran: Liste notes
- [ ] Écran: Créer résumé (texte only)
- [ ] Écran: Créer note
- [ ] Push notifications

**Livrables:**
- App iOS/Android publiée
- Sync temps réel avec web

---

## Backlog (Features futures)

### Social Features
- [ ] Commentaires sur posts publics
- [ ] Likes sur posts
- [ ] Follow utilisateurs
- [ ] Notifications (new follower, comment, etc.)

### Advanced Features
- [ ] Collections (grouper articles/notes)
- [ ] Partage collections
- [ ] Collaboration temps réel (notes partagées)
- [ ] API publique (webhooks, REST API)
- [ ] Intégrations (Notion, Obsidian, Slack)

### B2B Features
- [ ] Équipes/organisations
- [ ] Rôles équipe (Owner, Member, Viewer)
- [ ] Facturation équipe
- [ ] Analytics équipe

### AI Advanced
- [ ] Fine-tuning modèles (style personnalisé)
- [ ] Multi-language summaries
- [ ] Audio transcription → résumé
- [ ] Image OCR → résumé

---

## Metrics de succès

### Phase MVP (Fin Phase 1)
- ✅ Auth complète
- ✅ Veille IA fonctionnelle (3 sources RSS)
- ✅ Résumés IA (4 styles, texte + PDF)
- ✅ Notes CRUD
- ✅ 3 plans Stripe
- ✅ Limites freemium appliquées

### Phase Enrichissement (Fin Phase 2)
- ✅ Posts publics
- ✅ 6 styles résumé
- ✅ URLs web support
- ✅ Export MD/PDF
- ✅ Proposer sources RSS

### Phase Launch (Fin Phase 3)
- ✅ Landing page SEO
- ✅ Tests E2E passants
- ✅ Beta testing (10-20 users)
- ✅ Production déployée
- ✅ Communication lancée

### Post-Launch (1 mois après)
- 🎯 100+ utilisateurs inscrits
- 🎯 10+ clients payants (STARTER/PRO)
- 🎯 500+ résumés générés
- 🎯 Taux rétention D7: 30%+
- 🎯 MRR: 100€+

---

## Risques & Contingences

### Risque 1: Dépassement budget OpenAI
**Plan B:**
- Utiliser GPT-3.5 pour styles simples (SHORT, TWEET)
- Cache résumés similaires (hash du texte)
- Augmenter limite STARTER à 10€/mois si coûts trop élevés

### Risque 2: Faible adoption
**Plan B:**
- Augmenter freemium (10 → 20 résumés/mois)
- Trial PRO 14 jours au lieu de 7
- Content marketing agressif (blog, SEO)

### Risque 3: Bugs critiques post-launch
**Plan B:**
- Hotfix rapide (< 2h)
- Rollback si nécessaire
- Communication transparente users

### Risque 4: Concurrence
**Plan B:**
- Différenciation par niche (dev/IA)
- Focus qualité résumés
- Community-driven (users proposent sources)

---

## Prochaines étapes immédiates

### Cette semaine (Semaine 1)
1. ✅ Setup projet (déjà fait)
2. 🔄 Créer Prisma schema
3. 🔄 Configurer i18n
4. 🔄 Setup Stripe products
5. 🔄 Seed DB avec flux RSS test

### Semaine prochaine (Semaine 2)
6. Auth adaptation
7. Veille IA backend
8. Tests unitaires

---

**Document créé:** 2025-10-20
**Dernière mise à jour:** 2025-10-20
**Version:** 1.0

**Estimation totale:** 8-10 semaines jusqu'au launch public
**Next milestone:** Phase 0 complète (1 semaine)
