# NoteFlow - Documentation Plan

## 📚 Guide des documents

Ce dossier contient toute la planification du projet NoteFlow. Voici comment utiliser chaque document:

---

## 🎯 Par besoin

### "Je veux comprendre le projet"
→ **[MVP-PLAN.md](MVP-PLAN.md)**
- Qu'est-ce que NoteFlow?
- Quelles sont les fonctionnalités?
- Les 3 plans (FREE, STARTER, PRO)
- Modèle de données complet
- Product-Led Growth strategies

### "Je veux voir le planning global"
→ **[ROADMAP.md](ROADMAP.md)**
- Vue macro: 4 phases, 8-10 semaines
- Sprints organisés par thème
- Durées estimées
- KPIs & metrics de succès
- Risques & mitigation

### "Je veux coder la prochaine feature"
→ **[TDD-WORKFLOW.md](TDD-WORKFLOW.md)**
- Vue micro: feature par feature
- Cycle Test → Code → Commit
- Exemples de tests concrets
- Ordre d'exécution précis
- **C'EST VOTRE BIBLE AU QUOTIDIEN**

### "Je veux comprendre l'architecture technique"
→ **[ARCHITECTURE.md](ARCHITECTURE.md)**
- Structure monorepo détaillée
- Services backend (tous les services)
- Queues BullMQ (async jobs)
- Frontend (pages, composants, hooks)
- Prisma schema complet
- Intégrations externes (OpenAI, Stripe, RSS)

### "Je veux savoir comment tester"
→ **[TESTING-STRATEGY.md](TESTING-STRATEGY.md)**
- Approche TDD expliquée
- Types de tests (unit, integration, E2E)
- Exemples concrets de tests
- Coverage minimale requise
- Commandes de test
- Bonnes pratiques

---

## 📖 Ordre de lecture recommandé

### Pour démarrer le projet (1ère fois):
1. **[MVP-PLAN.md](MVP-PLAN.md)** - Comprendre le produit (15 min)
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Comprendre la tech (20 min)
3. **[ROADMAP.md](ROADMAP.md)** - Vue d'ensemble planning (10 min)
4. **[TESTING-STRATEGY.md](TESTING-STRATEGY.md)** - Comprendre TDD (15 min)
5. **[TDD-WORKFLOW.md](TDD-WORKFLOW.md)** - Commencer à coder (ongoing)

### Au quotidien pendant le dev:
1. **[TDD-WORKFLOW.md](TDD-WORKFLOW.md)** - Quelle feature coder aujourd'hui?
2. **[TESTING-STRATEGY.md](TESTING-STRATEGY.md)** - Comment écrire le test?
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Où mettre le code?

---

## 🗂️ Structure des documents

```
plan/
├── INDEX.md                    ← Vous êtes ici
├── MVP-PLAN.md                 ← Product (quoi?)
├── ARCHITECTURE.md             ← Tech (comment?)
├── ROADMAP.md                  ← Planning macro (quand?)
├── TDD-WORKFLOW.md             ← Workflow micro (étape par étape)
└── TESTING-STRATEGY.md         ← Tests (qualité)
```

---

## 🎯 Workflow de développement

### Semaine 1 (Setup)
1. Lire **MVP-PLAN.md** + **ARCHITECTURE.md**
2. Suivre **TDD-WORKFLOW.md** Feature 0.1 à 0.4

### Semaines 2-5 (MVP Core)
1. Chaque matin: ouvrir **TDD-WORKFLOW.md**
2. Identifier la prochaine feature
3. Écrire le test (voir **TESTING-STRATEGY.md**)
4. Implémenter la feature
5. Commit
6. Repeat

### Semaine 6-7 (Enrichissement)
1. Continuer **TDD-WORKFLOW.md**
2. Vérifier avancement avec **ROADMAP.md**

### Semaine 8 (Polish & Launch)
1. Review **ROADMAP.md** Phase 3
2. Tests E2E selon **TESTING-STRATEGY.md**

---

## 📊 Résumé par document

| Document | Type | Utilisation | Mise à jour |
|----------|------|-------------|-------------|
| MVP-PLAN.md | Produit | Lire 1 fois | Stable |
| ARCHITECTURE.md | Technique | Référence régulière | Stable |
| ROADMAP.md | Planning | Check hebdo | Rarement |
| TDD-WORKFLOW.md | Workflow | **Quotidien** | Jamais (suivre l'ordre) |
| TESTING-STRATEGY.md | Qualité | Référence tests | Stable |

---

## 🚀 Prochaine étape

**Vous êtes prêt à commencer!**

Allez dans **[TDD-WORKFLOW.md](TDD-WORKFLOW.md)** et commencez par:
- **Feature 0.1:** Setup projet de base

---

**Créé:** 2025-10-20
**Projet:** NoteFlow
**Version:** 1.0
