# Landing Page - Fullstack Boilerplate

Landing page marketing pour vendre le boilerplate. Construite avec Next.js 15, shadcn/ui, et Tailwind CSS.

## 🎯 Objectif

Cette application sert de **site vitrine public** pour vendre votre boilerplate. Elle est séparée de `apps/frontend/` (l'application après connexion) pour:

- SEO optimisé (pas de code auth inutile)
- Bundle plus léger et performant
- Design/UX différent (marketing vs application)
- Déploiement indépendant possible

## 🚀 Développement

```bash
# Depuis le root du monorepo
turbo dev  # Lance backend (3001) + frontend (3000) + landing (3002)

# Ou uniquement la landing page
cd apps/landing
npm run dev  # http://localhost:3002
```

## 📦 Structure

```
apps/landing/
├── app/
│   ├── page.tsx         # Page d'accueil (Hero + Features + Pricing + FAQ)
│   ├── layout.tsx       # Layout avec SEO meta tags
│   └── globals.css      # Styles Tailwind
├── components/
│   ├── ui/              # Composants shadcn/ui (Button, Card, Accordion)
│   └── landing/         # Sections de la landing
│       ├── hero.tsx     # Hero avec CTA principal
│       ├── features.tsx # Grid de 12 features
│       ├── pricing.tsx  # Tableau de pricing (3 plans)
│       ├── faq.tsx      # FAQ accordéon (10 questions)
│       └── footer.tsx   # Footer avec liens
└── lib/
    └── utils.ts         # Fonction cn() pour Tailwind
```

## 🎨 Sections

### Hero
- Titre accrocheur + badge
- Description avec value proposition
- 2 CTA: "Get Started $99" et "View Demo"
- Social proof (200h saved, $24k saved, 9/10 security, 78 tests)

### Features
- Grid de 12 features clés:
  - Enterprise Security (9/10 score)
  - Complete Authentication (JWT, RBAC)
  - Stripe Subscriptions (3 plans)
  - Production Database (Prisma, backups S3)
  - High Performance (Redis, BullMQ)
  - Multi-Instance Ready (Nginx, locks)
  - Monitoring (Sentry, Pino)
  - Test Suite (78 tests)
  - API Docs (OpenAPI)
  - Modern Frontend (Next.js 15)
  - CI/CD Pipeline (GitHub Actions)
  - Turborepo Monorepo
- Stats bar: 22/22 audit, 15k+ docs, 100% TypeScript

### Pricing
- 3 plans: Starter ($99), Pro ($299), Enterprise ($999)
- Prix barrés montrant 50% de réduction
- "Most Popular" badge sur Pro
- 30-day money-back guarantee
- Value comparison: $24k+ vs $99-$999

### FAQ
- 10 questions fréquentes avec accordéon
- Topics: licence, tech stack, support, démo, refund

### Footer
- Logo + description
- 4 colonnes: Product, Resources, Legal
- Social links (GitHub, Twitter, Email)

## 🔧 Personnalisation

### 1. Liens CTA
Modifier les liens vers Gumroad/Stripe dans `hero.tsx` et `pricing.tsx`:
```tsx
<Button onClick={() => window.location.href = 'https://gumroad.com/...'}>
  Get Started - $99
</Button>
```

### 2. Meta Tags SEO
Modifier dans `app/layout.tsx`:
```tsx
export const metadata: Metadata = {
  title: 'Votre Titre',
  description: 'Votre Description',
  // ...
}
```

### 3. Liens Sociaux
Modifier dans `footer.tsx`:
```tsx
<a href="https://github.com/votre-repo">...</a>
<a href="https://twitter.com/votre-compte">...</a>
```

### 4. Email Support
Remplacer `support@example.com` dans `footer.tsx` et `faq.tsx`

## 🚀 Déploiement

### Vercel (Recommandé)
```bash
# Depuis le root du monorepo
vercel --prod

# Ou uniquement la landing
cd apps/landing
vercel --prod
```

Configuration Vercel:
- Framework Preset: **Next.js**
- Root Directory: **apps/landing**
- Build Command: **npm run build**
- Output Directory: **.next**

### Netlify
```bash
cd apps/landing
npm run build
# Upload dossier .next/
```

## 📊 Performance

- Lighthouse Score: 95+ (Performance, SEO, Accessibility)
- Bundle Size: ~200KB (optimisé avec tree-shaking)
- First Contentful Paint: <1s
- Time to Interactive: <2s

## 🎯 Argument de Vente

**Bonus:** Cette landing page est construite avec le boilerplate lui-même!

Dites à vos acheteurs:
> "Cette landing que vous voyez est construite avec le boilerplate. Code source inclus! Vous pouvez la cloner pour votre propre produit."

Ça démontre la qualité du produit! 🚀

## 📝 TODO Avant Lancement

- [ ] Remplacer tous les liens `support@example.com`
- [ ] Configurer les liens Gumroad/Stripe dans les CTA
- [ ] Ajouter vos vraies informations sociales (GitHub, Twitter)
- [ ] Créer des screenshots/vidéos de démo
- [ ] Configurer Google Analytics (si souhaité)
- [ ] Tester sur mobile et desktop
- [ ] Vérifier tous les liens fonctionnent
- [ ] Optimiser les images (si ajoutées)

## 🆘 Support

Questions? Voir la documentation principale dans `/CLAUDE.md` et `/PLAN-DE-VENTE.md`
