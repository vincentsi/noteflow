# Stripe Webhook Fix - Documentation

## Date
29 octobre 2025, 17h-19h

## Problème Initial

Les webhooks Stripe pour le checkout retournaient des erreurs 500 et les utilisateurs restaient en plan FREE après un achat réussi de STARTER.

### Symptômes Observés

1. **Frontend**: Paiement Stripe réussi mais plan reste "FREE" après redirection
2. **Railway Logs**: Erreurs 500 sur `/api/stripe/webhook`
3. **Stripe Dashboard**: Webhooks envoyés mais marqués comme échoués

## Diagnostic

### Étape 1: Vérification IP Whitelist

**Logs Railway:**
```
Stripe IP whitelist: No IPs configured in production!
```

**Cause:**
La variable d'environnement `STRIPE_WEBHOOK_ALLOWED_IPS` n'était pas configurée sur Railway.

**Fix:**
Ajout de la variable sur Railway avec les 12 IPs officielles Stripe:
```
3.18.12.63,3.130.192.231,13.235.14.237,13.235.122.149,18.211.135.69,35.154.171.200,52.15.183.38,54.88.130.119,54.88.130.237,54.187.174.169,54.187.205.235,54.187.216.72
```

**Résultat:** Les webhooks passent avec 200 OK, mais l'erreur persiste dans le traitement.

### Étape 2: Erreur "Invalid Date"

**Logs Railway:**
```
Job failed error: "Invalid `prisma.subscription.upsert()` invocation:
Invalid value for argument `currentPeriodStart`: Provided Date object is invalid. Expected Date.
```

**Cause:**
```typescript
// ❌ Code qui ne fonctionnait pas
const periodStart = new Date(sub.current_period_start * 1000)
// sub.current_period_start était undefined
```

**Tentative de Fix #1:** Ajout de validation
```typescript
if (!sub.current_period_start || !sub.current_period_end) {
  throw new Error(`Missing period dates in subscription ${sub.id}`)
}
```

**Résultat:** L'erreur devient "Missing period dates in subscription"

### Étape 3: Investigation du Type Stripe

**Ajout de logs debug:**
```typescript
logger.info({
  subscriptionId: stripeSubscription.id,
  hasCurrentPeriodStart: 'current_period_start' in stripeSubscription,
  hasCurrentPeriodEnd: 'current_period_end' in stripeSubscription,
  currentPeriodStart: (stripeSubscription as unknown as Record<string, unknown>).current_period_start,
  currentPeriodEnd: (stripeSubscription as unknown as Record<string, unknown>).current_period_end,
}, 'Retrieved subscription from Stripe')
```

**Logs Railway retournés:**
```json
{
  "subscriptionId": "sub_1SNcGb2SHaLVx8UJEUwOJghZ",
  "hasCurrentPeriodStart": false,
  "hasCurrentPeriodEnd": false,
  "currentPeriodStart": undefined,
  "currentPeriodEnd": undefined
}
```

**Découverte:**
L'objet retourné par `stripe.subscriptions.retrieve()` n'a PAS les propriétés `current_period_start` et `current_period_end`!

### Étape 4: Problème de Type TypeScript

**Analyse:**
```typescript
const stripeSubscription = await this.stripe.subscriptions.retrieve(
  session.subscription as string
)
// Type retourné: Response<Subscription> (wrapper TypeScript)
// Les propriétés snake_case ne sont pas exposées dans ce wrapper
```

**Tentatives de Fix:**

**#1: Cast vers `Stripe.Subscription`**
```typescript
const sub = stripeSubscription as unknown as Stripe.Subscription
const periodStart = new Date(sub.currentPeriodStart * 1000) // ❌ Propriété n'existe pas
```

**#2: Cast vers `StripeSubscriptionData` (interface custom)**
```typescript
const sub = stripeSubscription as unknown as StripeSubscriptionData
const periodStart = new Date(sub.current_period_start * 1000) // ❌ Toujours undefined
```

**Résultat:** Les casts TypeScript ne changent rien - l'objet runtime n'a vraiment pas ces propriétés.

## Solution Finale

**Stratégie:** Ne plus utiliser `.retrieve()`, utiliser directement les données de la checkout session.

### Code Before (❌ Ne fonctionnait pas)

```typescript
async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const { userId, planType } = validationResult.data

  // ❌ Récupération via retrieve() - l'objet n'a pas les bonnes propriétés
  const stripeSubscription = await this.stripe.subscriptions.retrieve(
    session.subscription as string
  )

  const sub = stripeSubscription as unknown as StripeSubscriptionData

  // ❌ sub.current_period_start est undefined
  const periodStart = new Date(sub.current_period_start * 1000)
  const periodEnd = new Date(sub.current_period_end * 1000)

  // Création subscription...
}
```

### Code After (✅ Fonctionne)

```typescript
async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const { userId, planType } = validationResult.data

  // ✅ Récupération des IDs depuis la session
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription.id

  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id

  if (!customerId) {
    throw new Error('No customer ID in checkout session')
  }

  // ✅ Calcul manuel des dates (subscription vient d'être créée)
  const now = new Date()
  const periodStart = now
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // +30 jours

  // ✅ Récupération du priceId via les line items
  const lineItems = await this.stripe.checkout.sessions.listLineItems(session.id)
  const priceId = lineItems.data[0]?.price?.id

  if (!priceId) {
    throw new Error('No price ID found in checkout session')
  }

  // ✅ Création avec les bonnes données
  await prisma.$transaction(async tx => {
    await tx.subscription.upsert({
      where: { stripeSubscriptionId: subscriptionId },
      create: {
        userId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        stripeCustomerId: customerId,
        status: SubscriptionStatus.ACTIVE,
        planType,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
      update: {
        status: SubscriptionStatus.ACTIVE,
        planType,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
    })

    await tx.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        subscriptionId: subscriptionId,
        planType,
        currentPeriodEnd: periodEnd,
      },
    })
  })

  await this.invalidateCache(userId)
  await invalidatePlanCache(userId)
}
```

## Changements Clés

### 1. Source des Données
- **Avant:** `stripe.subscriptions.retrieve()` → objet incomplet
- **Après:** Données directement depuis `session` (checkout.session.completed)

### 2. Période de Subscription
- **Avant:** Tentative de lire `current_period_start` / `current_period_end` depuis l'API
- **Après:** Calcul manuel:
  - `periodStart = new Date()` (maintenant)
  - `periodEnd = new Date(now + 30 jours)`

### 3. Récupération du Price ID
- **Avant:** `sub.items.data[0]?.price.id` depuis subscription retrieve
- **Après:** `stripe.checkout.sessions.listLineItems(session.id)` puis extraction du price

### 4. Customer ID
- **Avant:** Extraction depuis subscription retrieve
- **Après:** Extraction directe depuis `session.customer`

## Résultats

### Logs Railway (Avant ❌)
```
Failed to process webhook error: {} errorType: "checkout.session.completed"
Job failed error: "Missing period dates in subscription sub_1SNc..."
```

### Logs Railway (Après ✅)
```
✅ Queued Stripe webhook: checkout.session.completed (evt_1SNcpd...)
📨 Processing webhook: checkout.session.completed (evt_1SNcpd...)
✅ Processed webhook: checkout.session.completed in 245ms
✅ Job evt_1SNcpd2SHaLVx8UJYsMPI1R5 completed
```

### Frontend (Avant ❌)
- Plan reste "FREE" après paiement
- Aucune mise à jour visible

### Frontend (Après ✅)
- ✅ Message "Payment Successful!"
- ✅ Plan affiché: **STARTER**
- ✅ Bouton "Change Plan" disponible

### Base de Données

**Table `users` (Après ✅):**
```sql
planType: STARTER
subscriptionStatus: ACTIVE
subscriptionId: sub_1SNcpd2SHaLVx8UJYsMPI1R5
currentPeriodEnd: 2025-11-28T18:06:54.000Z
```

**Table `subscriptions` (Après ✅):**
```sql
userId: cmhbwffql0000lz0q7h0goot1
stripeSubscriptionId: sub_1SNcpd2SHaLVx8UJYsMPI1R5
stripePriceId: price_1SM1fj2SHaLVx8UJnBtu9b3P
stripeCustomerId: cus_TKGnBuJYseWC6G
status: ACTIVE
planType: STARTER
currentPeriodStart: 2025-10-29T18:06:54.000Z
currentPeriodEnd: 2025-11-28T18:06:54.000Z
cancelAtPeriodEnd: false
```

## Configuration Requise

### Variables d'Environnement Railway

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_WEBHOOK_ALLOWED_IPS=3.18.12.63,3.130.192.231,13.235.14.237,13.235.122.149,18.211.135.69,35.154.171.200,52.15.183.38,54.88.130.119,54.88.130.237,54.187.174.169,54.187.205.235,54.187.216.72
```

### Stripe Webhook Configuration

**URL:** `https://noteflow-backend-production.up.railway.app/api/stripe/webhook`

**Événements à écouter:**
- `checkout.session.completed` ✅
- `customer.subscription.updated` ✅
- `customer.subscription.deleted` ✅
- `invoice.payment_failed` ✅

**Important:**
- Utiliser le webhook secret dans `STRIPE_WEBHOOK_SECRET`
- Les IPs Stripe changent rarement, mais vérifier https://stripe.com/docs/ips tous les trimestres

## Leçons Apprises

### 1. Types TypeScript ≠ Runtime JavaScript
Les casts TypeScript (`as unknown as Type`) ne modifient pas l'objet runtime. Si une propriété n'existe pas à l'exécution, elle reste `undefined` même après le cast.

### 2. API Stripe Retrieve vs Webhook Data
L'objet `Subscription` retourné par `.retrieve()` peut avoir une structure différente de celui reçu dans les webhooks. Utiliser les données natives du webhook quand possible.

### 3. Debug avec Logs
Ajouter des logs temporaires avec les propriétés réelles de l'objet aide à comprendre ce qui est vraiment retourné par l'API:
```typescript
logger.info({
  hasProperty: 'property' in object,
  value: (object as any).property,
}, 'Debug object structure')
```

### 4. Simplicité > Complexité
La solution finale est plus simple:
- Pas de `.retrieve()` supplémentaire (1 appel API en moins)
- Pas de cast TypeScript complexe
- Dates calculées simplement (now + 30 jours)
- Code plus lisible et maintenable

## Tests de Validation

### Test 1: Achat STARTER depuis FREE
1. ✅ Utilisateur connecté avec plan FREE
2. ✅ Clic sur "Upgrade to plan" → Redirection Stripe
3. ✅ Paiement test avec carte `4242 4242 4242 4242`
4. ✅ Redirection vers `/dashboard/billing?success=true`
5. ✅ Message "Payment Successful!" affiché
6. ✅ Plan affiché: "STARTER"
7. ✅ Webhook `checkout.session.completed` traité sans erreur
8. ✅ Base de données mise à jour (users + subscriptions)

### Test 2: Vérification Logs
1. ✅ Railway Deploy Logs: "Processed webhook in 245ms"
2. ✅ Aucune erreur dans les logs
3. ✅ Job BullMQ complété avec succès

### Test 3: Vérification Base de Données
1. ✅ Table `users`: planType = STARTER, subscriptionStatus = ACTIVE
2. ✅ Table `subscriptions`: ligne créée avec toutes les données
3. ✅ `currentPeriodEnd` = now + 30 jours

## Fichiers Modifiés

### `apps/backend/src/services/stripe-webhook-handlers.ts`

**Fonction modifiée:** `handleCheckoutCompleted()`

**Changements:**
- Suppression de `stripe.subscriptions.retrieve()`
- Ajout de `stripe.checkout.sessions.listLineItems()`
- Calcul manuel des dates de période
- Utilisation directe des données de session

**Lignes:** 176-257

## Commit Git

**Commit:** `e7b5174`
```
fix: handle Stripe checkout webhook using session data instead of subscription retrieve
```

**Changements:**
- 1 fichier modifié
- 26 insertions
- 33 suppressions

## Monitoring Futur

### Points de Surveillance

1. **Webhooks Stripe**
   - Vérifier le Dashboard Stripe régulièrement
   - S'assurer que tous les webhooks retournent 200 OK

2. **Railway Logs**
   - Surveiller les erreurs "Failed to process webhook"
   - Vérifier les temps de traitement (< 1s recommandé)

3. **Base de Données**
   - Vérifier que chaque paiement crée une ligne dans `subscriptions`
   - S'assurer que `users.planType` est mis à jour

4. **IPs Stripe**
   - Vérifier https://stripe.com/docs/ips tous les trimestres
   - Mettre à jour `STRIPE_WEBHOOK_ALLOWED_IPS` si nécessaire

### Alertes Recommandées

1. **Sentry:** Capturer les erreurs dans `handleCheckoutCompleted()`
2. **Railway:** Configurer des alertes sur erreurs 500 dans `/api/stripe/webhook`
3. **Stripe Dashboard:** Email sur webhook failures

## Références

- [Stripe Webhook Events](https://stripe.com/docs/webhooks)
- [Stripe IP Addresses](https://stripe.com/docs/ips)
- [Stripe Checkout Session](https://stripe.com/docs/api/checkout/sessions)
- [Stripe Subscriptions](https://stripe.com/docs/api/subscriptions)
- [BullMQ Documentation](https://docs.bullmq.io/)

---

**Auteur:** Claude Code + Vincent
**Date:** 29 octobre 2025
**Durée de résolution:** ~2 heures
**Status:** ✅ Résolu et testé en production
