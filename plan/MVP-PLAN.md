# NoteFlow - Plan MVP

## ⚠️ IMPORTANT - WORKFLOW DE DÉVELOPPEMENT

**Ce document décrit la vision finale du produit.**

Pour l'implémentation, **SUIVRE STRICTEMENT** le fichier `TDD-WORKFLOW.md` qui détaille l'ordre exact des features à implémenter.

**❌ NE PAS créer tous les modèles Prisma d'un coup**
**✅ Créer les modèles progressivement selon TDD-WORKFLOW.md**

Les modèles Prisma de la section 6 ci-dessous représentent la **cible finale**, mais ils seront créés feature par feature dans cet ordre:
1. Feature 0.2: User avec `language` et `plan`
2. Feature 1.2.1: Article + SavedArticle
3. Feature 1.4.1: Summary
4. Feature 1.6.1: Note
5. Feature 1.8.1: Post

---

## Vue d'ensemble
NoteFlow est une plateforme tout-en-un pour les développeurs qui combine veille IA, résumés intelligents et prise de notes collaborative.

**Public cible:** Développeurs, professionnels de l'IA
**Langues:** Français + Anglais
**Plateformes:** Web (MVP) → Mobile (Phase 2)

---

## 1. Fonctionnalités principales

### 1.1 Veille IA
**Description:** Agrégation automatique d'articles tech/IA depuis sources RSS

**Fonctionnalités:**
- Flux RSS automatique (3-5 sources fiables pour commencer)
- Sources ciblées: Dev, IA, Tech
- Affichage liste avec filtres (tag, source, date)
- Sauvegarde d'articles favoris
- CTA "Lire l'article" → redirection vers site original

**Stockage:**
- Titre
- URL
- Date de publication
- Source
- Extrait (preview)
- Tags automatiques

**Features PRO:**
- Utilisateurs PRO (15€) peuvent proposer de nouvelles sources RSS
- Admin valide les propositions

**Product-Led Growth:**
- Widget "Abonnez-vous à votre veille personnalisée" (gratuit)
- Partage d'articles → acquisition virale

---

### 1.2 PowerPost - Résumés IA intelligents
**Description:** Upload/coller du contenu → résumé IA avec plusieurs styles

**Sources acceptées:**
- PDF
- DOCX
- TXT
- Copier-coller texte
- **URLs web** (extraction automatique)

**6 styles de résumé IA:**
1. **SHORT** - Résumé court (2-3 phrases)
2. **TWEET** - Format Twitter (280 caractères)
3. **THREAD** - Thread Twitter (série de tweets)
4. **BULLET_POINT** - Points clés en liste
5. **TOP3** - Top 3 des highlights
6. **MAIN_POINTS** - Points principaux détaillés

**Fonctionnalités:**
- Traitement async avec BullMQ (job queue)
- Stockage: résumé + texte original
- Historique des résumés
- Régénération possible (consomme 1 crédit)

**MVP Phase 1:**
- Copier-coller + PDF uniquement
- 3-4 styles de résumé (SHORT, BULLET_POINT, TWEET, THREAD)

**Phase 2:**
- DOCX support
- URLs web
- Tous les 6 styles

---

### 1.3 PowerNote - Notes personnelles & publication
**Description:** Bloc-notes avec CRUD + option de transformation en post public

**Fonctionnalités:**
- Création/Édition/Suppression de notes
- Markdown editor (simple)
- Tagging manuel
- Recherche full-text
- Organisation par dossiers/tags

**Feature clé: Transformer note → Post public**
- L'utilisateur peut publier une note sur la plateforme
- Posts visibles par tous les utilisateurs (feed public)
- Possibilité de liker/commenter (Phase 2)

**Export:**
- **STARTER (6€):** Export Markdown
- **PRO (15€):** Export PDF + Markdown

**Feature STARTER (6€):**
- Résumé IA d'une note (comme PowerPost)
- Permet de résumer ses propres notes

---

## 2. Authentification & Autorisation

### Auth providers
- Email + Password (JWT + refresh token)
- Google OAuth (Phase 1)
- GitHub OAuth (Phase 2 - pertinent pour devs)

### Rôles
- **USER:** Utilisateur standard
- **ADMIN:** Gestion utilisateurs, validation sources RSS, modération posts

### Tokens
- Access token: 15 minutes
- Refresh token: 7 jours
- httpOnly cookies pour sécurité

---

## 3. Monétisation - 3 Plans

### FREE (Gratuit)
**Limites:**
- 10 articles sauvegardés
- 5 résumés IA/mois
- 20 notes max
- Pas d'export
- Pas de publication de posts publics

**Features:**
- Veille IA (lecture seule)
- Résumés PowerPost basiques
- Notes personnelles simples

---

### STARTER (6€/mois)
**Limites:**
- 50 articles sauvegardés
- 20 résumés IA/mois
- 100 notes max

**Features:**
- Tout FREE +
- Résumé IA sur notes PowerNote
- Export Markdown
- Publication de posts publics (max 10/mois)
- Support prioritaire

---

### PRO (15€/mois)
**Limites:**
- TOUT illimité

**Features:**
- Tout STARTER +
- Résumés IA illimités
- Articles sauvegardés illimités
- Notes illimitées
- Export PDF + Markdown
- Proposer sources RSS (validation admin)
- Publications publiques illimitées
- Accès mobile prioritaire (quand disponible)
- Analytics sur posts publiés

---

## 4. Stack technique

### Backend
- **Fastify** - API haute performance
- **Prisma + PostgreSQL** - ORM + base de données
- **Redis** - Cache + sessions
- **BullMQ** - Queue jobs IA (résumés async)
- **JWT** - Auth + refresh tokens
- **Zod** - Validation des schémas

### Frontend
- **Next.js 15** - SSR/SSG pour SEO
- **TanStack Query** - Data fetching + cache
- **Tailwind CSS + shadcn/ui** - Design system
- **React Hook Form + Zod** - Gestion formulaires
- **i18next** - Internationalisation (FR/EN)

### IA
- **OpenAI GPT-4** ou **Claude** - Résumés intelligents
- **Queue workers** - Traitement async (éviter appels sync)

### Paiements
- **Stripe Subscriptions** - Gestion abonnements
- **Stripe Customer Portal** - Self-service billing

### Mobile (Phase 2)
- **React Native / Expo** - App cross-platform
- Consultation articles + notes
- Édition légère

---

## 5. Architecture MVP

```
[Frontend Next.js]
       ↓ API
[Fastify + Prisma]
       ↓
[PostgreSQL] ← Données principales
       ↓
[Redis] ← Cache + Sessions + Queue
       ↓
[BullMQ Workers] ← Jobs IA async
       ↓
[OpenAI/Claude API] ← Résumés IA
```

**Flow résumé IA:**
1. User upload doc/URL
2. Backend crée job dans Redis (BullMQ)
3. Frontend reçoit job ID (statut: pending)
4. Worker traite job async → appel IA
5. Job terminé → webhook/polling frontend
6. Résumé affiché

---

## 6. Modèle de données (Prisma Schema)

### User
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  password      String?  // null si OAuth
  name          String?
  role          Role     @default(USER)
  plan          Plan     @default(FREE)
  stripeCustomerId String?
  emailVerified Boolean  @default(false)

  articles      SavedArticle[]
  summaries     Summary[]
  notes         Note[]
  posts         Post[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
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
```

### Article (Veille IA)
```prisma
model Article {
  id          String   @id @default(cuid())
  title       String
  url         String   @unique
  excerpt     String?
  source      String
  tags        String[]
  publishedAt DateTime

  savedBy     SavedArticle[]

  createdAt   DateTime @default(now())
}

model SavedArticle {
  id        String   @id @default(cuid())
  userId    String
  articleId String

  user      User     @relation(fields: [userId], references: [id])
  article   Article  @relation(fields: [articleId], references: [id])

  createdAt DateTime @default(now())

  @@unique([userId, articleId])
}
```

### Summary (PowerPost)
```prisma
model Summary {
  id            String        @id @default(cuid())
  userId        String
  title         String?
  originalText  String        @db.Text
  summaryText   String        @db.Text
  style         SummaryStyle
  source        String?       // URL ou nom fichier

  user          User          @relation(fields: [userId], references: [id])

  createdAt     DateTime      @default(now())
}

enum SummaryStyle {
  SHORT
  TWEET
  THREAD
  BULLET_POINT
  TOP3
  MAIN_POINTS
}
```

### Note (PowerNote)
```prisma
model Note {
  id        String   @id @default(cuid())
  userId    String
  title     String
  content   String   @db.Text
  tags      String[]
  folder    String?

  user      User     @relation(fields: [userId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Post (Publications publiques)
```prisma
model Post {
  id        String   @id @default(cuid())
  userId    String
  title     String
  content   String   @db.Text
  tags      String[]
  published Boolean  @default(true)
  views     Int      @default(0)

  user      User     @relation(fields: [userId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

---

## 7. Priorités MVP (Phase 1)

### Must-Have (Sprint 1-2)
1. Auth email + Google OAuth
2. Système de rôles (USER/ADMIN)
3. Veille IA: flux RSS + affichage liste
4. PowerPost: copier-coller + PDF → résumé IA (3 styles: SHORT, BULLET, TWEET)
5. Queue BullMQ pour résumés async
6. Dashboard: articles sauvegardés + résumés + notes
7. Limites freemium + middleware de vérification

### Should-Have (Sprint 3)
8. PowerNote: CRUD notes + tagging
9. Recherche full-text notes
10. Export Markdown (STARTER)
11. Stripe: checkout + webhooks + portal
12. Filtres avancés veille IA

### Nice-to-Have (Sprint 4)
13. Transformer note → post public
14. Feed public des posts
15. PowerPost: support URLs web
16. Style THREAD + MAIN_POINTS
17. i18n FR/EN
18. Export PDF (PRO)

---

## 8. Product-Led Growth

### Acquisition
- **Widget veille gratuite** → embed sur site externe
- **Posts publics** → indexés SEO
- **Partage résumés** → lien public (attire trafic)

### Activation
- **Onboarding guidé** (3 étapes)
- **First value fast:** 1er résumé IA gratuit immédiat
- **Template notes** pré-remplis pour démonstration

### Rétention
- **Email hebdo:** "Vos articles de la semaine"
- **Notifications:** nouveaux articles selon tags favoris
- **Gamification:** badges (10 résumés, 50 notes, etc.)

### Monétisation
- **Soft paywall:** atteint limite → popup "Upgrade pour continuer"
- **Teasing PRO:** montrer features PRO grisées
- **Trial 7 jours PRO** pour nouveaux utilisateurs

---

## 9. Roadmap

### Phase 1: MVP Core (1-2 mois)
- Auth + roles
- Veille IA basique (3 sources RSS)
- PowerPost (copier-coller + PDF, 3 styles)
- PowerNote (CRUD basique)
- Stripe FREE/STARTER/PRO
- Dashboard simple

### Phase 2: Enrichissement (1 mois)
- PowerPost: URLs web + tous styles
- Posts publics + feed
- Export PDF
- i18n FR/EN
- Proposer sources RSS (PRO)
- Analytics basiques

### Phase 3: Mobile (2 mois)
- React Native app
- Sync temps réel
- Push notifications
- Lecture offline

### Phase 4: Social & Advanced (backlog)
- Commentaires sur posts
- Follow utilisateurs
- Collections partagées
- API publique pour intégrations
- Webhooks
- Équipes/organisations (B2B)

---

## 10. KPIs & Métriques

### Acquisition
- Visiteurs uniques/mois
- Inscriptions/semaine
- Taux de conversion visiteur → inscription

### Engagement
- Résumés IA générés/utilisateur
- Articles sauvegardés/utilisateur
- Notes créées/utilisateur
- DAU/MAU ratio

### Monétisation
- MRR (Monthly Recurring Revenue)
- Taux conversion FREE → STARTER
- Taux conversion STARTER → PRO
- Churn rate par plan
- LTV (Lifetime Value)

### Rétention
- Retention D1, D7, D30
- Utilisateurs actifs hebdo
- Taux retour après 1er résumé

---

## 11. Risques & Mitigation

### Risque 1: Coûts IA élevés
**Impact:** Résumés IA coûtent cher (OpenAI)
**Mitigation:**
- Limites strictes FREE/STARTER
- Cache résumés similaires
- Utiliser modèles moins chers (GPT-3.5 pour SHORT)
- Monitorer coûts avec alerts

### Risque 2: Qualité flux RSS
**Impact:** Sources RSS mal structurées
**Mitigation:**
- Valider 3-5 sources fiables au départ
- Fallback si parsing échoue
- Admin peut désactiver source problématique

### Risque 3: Abus utilisateurs
**Impact:** Génération massive résumés pour revente
**Mitigation:**
- Rate limiting strict
- Captcha sur actions sensibles
- Détection patterns suspects
- Ban automatique si abus

### Risque 4: SEO concurrence
**Impact:** Niche compétitive
**Mitigation:**
- Focus niche dev/IA au départ
- Posts publics → contenu SEO unique
- Blog intégré pour content marketing

---

## 12. Prochaines étapes

1. **Setup projet** (boilerplate déjà cloné ✅)
2. **Définir Prisma schema** complet
3. **Configurer i18n** (FR/EN)
4. **Intégrer OpenAI/Claude API**
5. **Créer components UI** (feed articles, résumé display, note editor)
6. **Setup BullMQ** + workers
7. **Stripe products** (FREE/STARTER/PRO)
8. **Tests E2E** (Playwright)
9. **Deploy staging**
10. **Beta testing** avec 10-20 devs

---

**Document créé:** 2025-10-20
**Dernière mise à jour:** 2025-10-20
**Version:** 1.0
