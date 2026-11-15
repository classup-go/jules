# Guide de Tests - Système de Paiement Multi-Devises

Ce guide détaille comment tester les 3 flux de paiement de Jules Class Go : abonnements, achats de cours, et réservations 1-to-1.

## 📋 Prérequis

### 1. Configuration Stripe Test Mode

Assurez-vous que votre `.env.local` contient les clés de test Stripe :

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Installation Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Windows
scoop install stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_X.X.X_linux_x86_64.tar.gz
tar -xvf stripe_X.X.X_linux_x86_64.tar.gz
```

### 3. Connexion Stripe CLI

```bash
stripe login
```

### 4. Lancer le serveur de développement

```bash
npm run dev
```

### 5. Lancer le tunnel webhook (dans un terminal séparé)

```bash
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

Notez le webhook secret affiché : `whsec_...` et ajoutez-le à `.env.local` si ce n'est pas déjà fait.

---

## 🧪 Test 1 : Flow Abonnement (Subscription)

### Scénario : Utilisateur s'abonne au plan "Essentiel" depuis la landing page

#### Étape 1 : Accéder à la landing page

```
http://localhost:3000
```

- Scrollez jusqu'à la section "Tarifs" (#tarifs)
- Vérifiez que le prix est affiché en EUR par défaut
- Le bouton doit afficher "Essai gratuit - 19€/mois" (ou prix converti selon géolocalisation)

#### Étape 2 : Cliquer sur "Essai gratuit" (Plan Essentiel)

**Ce qui devrait se passer :**
1. Le bouton affiche un spinner "Chargement..."
2. Appel POST à `/api/subscriptions/create` avec :
   ```json
   {
     "plan_type": "essentiel",
     "currency": "EUR",
     "exchangeRate": 1
   }
   ```
3. Redirection automatique vers Stripe Checkout

**Vérification dans les DevTools (Network tab) :**
- Status: `200 OK`
- Response body : `{ "url": "https://checkout.stripe.com/c/pay/cs_test_..." }`

#### Étape 3 : Compléter le paiement Stripe

**Données de test à utiliser :**

| Champ | Valeur |
|-------|--------|
| Email | test@example.com |
| Numéro de carte | `4242 4242 4242 4242` (Visa) |
| Date d'expiration | N'importe quelle date future (ex: 12/34) |
| CVC | N'importe quel 3 chiffres (ex: 123) |
| Nom | Test User |
| Pays | France |

**Autres cartes de test utiles :**
- `4000 0027 6000 3184` - Carte tunisienne (TND)
- `4000 0008 4000 1280` - Carte US (USD)
- `4000 0025 0000 3155` - Carte d'Afrique de l'Ouest (XOF)
- `5555 5555 5555 4444` - Mastercard
- `3782 822463 10005` - American Express

#### Étape 4 : Vérifier le webhook

Dans le terminal avec `stripe listen`, vous devriez voir :

```
✔ Received event: checkout.session.completed
✔ Forwarded to localhost:3000/api/webhook/stripe
✔ Response: 200 OK
```

**Vérification dans les logs serveur (terminal npm run dev) :**
```
✅ Transaction créée: trans_xxx
✅ Subscription activée: sub_xxx
✅ User plan mis à jour: essentiel
```

#### Étape 5 : Vérifier la page de succès

**URL attendue :**
```
http://localhost:3000/payment/success?subscription=true
```

**Éléments visibles :**
- ✅ Icône de succès
- Titre : "Paiement réussi !"
- Message : "Votre abonnement **essentiel** est actif !"
- Bouton : "Découvrir les cours →"
- Détails de la transaction (montant, date, référence)

#### Étape 6 : Vérifier la base de données

**Dans Supabase SQL Editor :**

```sql
-- 1. Vérifier la transaction
SELECT
  id,
  payment_type,
  status,
  amount_eur,
  amount_local,
  currency,
  payment_provider,
  provider_transaction_id,
  created_at
FROM transactions
WHERE payment_type = 'subscription'
ORDER BY created_at DESC
LIMIT 1;

-- Résultat attendu :
-- payment_type: 'subscription'
-- status: 'completed'
-- amount_eur: 19.00
-- payment_provider: 'stripe'
-- provider_transaction_id: cs_test_...

-- 2. Vérifier la subscription
SELECT
  id,
  user_id,
  plan_type,
  status,
  stripe_subscription_id,
  current_period_start,
  current_period_end,
  cancel_at_period_end
FROM subscriptions
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 1;

-- Résultat attendu :
-- plan_type: 'essentiel'
-- status: 'active'
-- stripe_subscription_id: sub_...
-- cancel_at_period_end: false

-- 3. Vérifier la mise à jour du user
SELECT
  id,
  email,
  plan,
  plan_expires_at
FROM users
WHERE id = (SELECT user_id FROM subscriptions ORDER BY created_at DESC LIMIT 1);

-- Résultat attendu :
-- plan: 'essentiel'
-- plan_expires_at: date dans ~30 jours
```

#### ✅ Critères de succès

- [ ] Bouton pricing fonctionne et affiche le prix converti
- [ ] Redirection vers Stripe Checkout réussie
- [ ] Paiement Stripe accepté
- [ ] Webhook reçu et traité (200 OK)
- [ ] Transaction créée dans la DB (status: completed)
- [ ] Subscription créée (status: active)
- [ ] User.plan mis à jour
- [ ] Redirection vers /payment/success?subscription=true
- [ ] Page de succès affiche les bonnes informations

---

## 🧪 Test 2 : Flow Achat de Cours (Course Enrollment)

### Scénario : Étudiant achète un cours payant

#### Étape 1 : Accéder à un cours payant

1. Connexion en tant qu'étudiant :
   ```
   http://localhost:3000/login
   ```

2. Naviguer vers les cours :
   ```
   http://localhost:3000/courses
   ```

3. Cliquer sur un cours avec `price > 0` (ex: Mathématiques Terminale - 25€)

#### Étape 2 : Cliquer sur "S'inscrire pour XX€"

**Ce qui devrait se passer :**
1. Redirection vers `/checkout?classroom=<classroom_id>`
2. Page de checkout affiche :
   - Titre du cours
   - Image du cours
   - Prix en EUR (ou devise locale détectée)
   - Choix de méthode de paiement
   - Récapitulatif

#### Étape 3 : Sélectionner "Carte bancaire" et cliquer "Payer maintenant"

**Vérification dans Network tab :**
- POST `/api/checkout`
- Body :
  ```json
  {
    "classroomId": "uuid",
    "currency": "EUR",
    "exchangeRate": 1
  }
  ```
- Response : `{ "url": "https://checkout.stripe.com/..." }`

#### Étape 4 : Compléter le paiement

Utilisez les mêmes données de test que le Test 1.

#### Étape 5 : Vérifier le webhook

**Dans le terminal Stripe CLI :**
```
✔ Received event: checkout.session.completed
✔ Metadata: { payment_type: 'course_enrollment', classroom_id: '...', ... }
✔ Response: 200 OK
```

**Dans les logs serveur :**
```
✅ Transaction créée: trans_xxx (payment_type: course_enrollment)
✅ Enrollment créé: enrollment_xxx
✅ enrolled_count incrémenté
✅ Notification envoyée à l'étudiant
```

#### Étape 6 : Vérifier la redirection

**URL attendue :**
```
http://localhost:3000/payment/success?classroom_id=<classroom_id>
```

**Éléments visibles :**
- ✅ Icône de succès
- Message : "Vous êtes maintenant inscrit à **[Nom du cours]**"
- Bouton : "Commencer le cours →"
- Détails de paiement

#### Étape 7 : Vérifier la base de données

```sql
-- 1. Transaction
SELECT
  id,
  payment_type,
  status,
  amount_eur,
  metadata->>'classroom_id' as classroom_id,
  created_at
FROM transactions
WHERE payment_type = 'course_enrollment'
ORDER BY created_at DESC
LIMIT 1;

-- Résultat attendu :
-- payment_type: 'course_enrollment'
-- status: 'completed'
-- metadata contient classroom_id

-- 2. Enrollment
SELECT
  e.id,
  e.classroom_id,
  e.student_id,
  e.payment_id,
  e.payment_completed_at,
  e.status,
  c.title as course_title
FROM enrollments e
JOIN classrooms c ON c.id = e.classroom_id
WHERE e.payment_id IS NOT NULL
ORDER BY e.created_at DESC
LIMIT 1;

-- Résultat attendu :
-- payment_id: UUID de la transaction
-- payment_completed_at: date/heure du paiement
-- status: 'active'

-- 3. Vérifier enrolled_count
SELECT
  id,
  title,
  price,
  enrolled_count
FROM classrooms
WHERE id = '<classroom_id>';

-- enrolled_count doit avoir augmenté de 1
```

#### Étape 8 : Vérifier l'accès au cours

1. Naviguer vers `/classroom/<classroom_id>`
2. Vérifier que l'étudiant peut accéder au contenu (pas de paywall)
3. Vérifier que le bandeau "Inscrit" ou similaire est affiché

#### ✅ Critères de succès

- [ ] Page checkout affiche correctement le cours et le prix
- [ ] Redirection Stripe réussie
- [ ] Paiement accepté
- [ ] Webhook traité (200 OK)
- [ ] Transaction créée (status: completed, payment_type: course_enrollment)
- [ ] Enrollment créé avec payment_id
- [ ] enrolled_count incrémenté
- [ ] Redirection vers /payment/success?classroom_id=xxx
- [ ] Accès au cours activé pour l'étudiant

---

## 🧪 Test 3 : Flow Réservation 1-to-1 (Booking)

### Scénario : Étudiant réserve une session avec un professeur

#### Étape 1 : Trouver un professeur

1. Naviguer vers la liste des professeurs :
   ```
   http://localhost:3000/teachers
   ```

2. Cliquer sur un professeur qui a défini son `hourly_rate` (ex: 30€/h)

3. Cliquer sur "Réserver une session" ou naviguer directement :
   ```
   http://localhost:3000/book/<teacher_id>
   ```

#### Étape 2 : Interface de réservation

**Éléments visibles :**
- Nom et photo du professeur
- Tarif horaire (ex: 30€/h)
- Sélecteur de durée : 30 min, 60 min, 90 min, 120 min
- Calendrier avec dates disponibles (30 prochains jours)
- Créneaux horaires disponibles (9h-18h, sauf dimanches et slots déjà réservés)
- Zone de notes (optionnel)
- Récapitulatif avec prix calculé en temps réel

#### Étape 3 : Sélectionner une session

1. **Choisir la durée** : Cliquer sur "60 min"
   - Le prix devrait s'afficher : 30€ (si tarif horaire = 30€/h)

2. **Choisir une date** : Cliquer sur une date disponible (ex: demain)
   - Les créneaux horaires de cette date s'affichent

3. **Choisir une heure** : Cliquer sur un créneau (ex: 14:00)
   - Le créneau est mis en surbrillance
   - Le récapitulatif se met à jour

4. **Ajouter des notes** (optionnel) :
   ```
   Je souhaite revoir les équations du second degré
   ```

#### Étape 4 : Cliquer sur "Réserver et payer 30€"

**Vérification dans Network tab :**
- POST `/api/bookings`
- Body :
  ```json
  {
    "teacher_id": "uuid",
    "scheduled_at": "2026-01-16T14:00:00.000Z",
    "duration": 60,
    "student_notes": "Je souhaite revoir...",
    "currency": "EUR",
    "exchangeRate": 1
  }
  ```
- Response : `{ "url": "https://checkout.stripe.com/...", "booking_id": "uuid" }`

#### Étape 5 : Vérifier la base de données (avant paiement)

```sql
-- Booking doit être créé avec status 'pending'
SELECT
  id,
  student_id,
  teacher_id,
  scheduled_at,
  duration,
  hourly_rate_eur,
  total_price_eur,
  status,
  student_notes
FROM bookings
ORDER BY created_at DESC
LIMIT 1;

-- Résultat attendu :
-- status: 'pending' (en attente du paiement)
-- hourly_rate_eur: 30.00
-- total_price_eur: 30.00 (30€ * 60min / 60)
-- student_notes: "Je souhaite revoir..."
```

#### Étape 6 : Compléter le paiement Stripe

Utilisez les mêmes données de test.

**Description du produit Stripe visible :**
```
Session 1-to-1 avec [Nom du Prof]
60 minutes - jeudi 16 janvier 2026 à 14:00
```

#### Étape 7 : Vérifier le webhook

**Dans Stripe CLI :**
```
✔ Received event: checkout.session.completed
✔ Metadata: { payment_type: 'booking', booking_id: '...', ... }
✔ Response: 200 OK
```

**Dans les logs serveur :**
```
✅ Transaction créée: trans_xxx (payment_type: booking)
✅ Booking confirmé: booking_xxx (status: pending → confirmed)
✅ Live session créée: live_session_xxx
✅ Notification envoyée à l'étudiant et au professeur
✅ Invitation calendrier générée
```

#### Étape 8 : Vérifier la page de succès

**URL attendue :**
```
http://localhost:3000/payment/success?booking_id=<booking_id>
```

**Éléments visibles :**
- ✅ Icône de succès
- Message : "Votre session avec **[Nom du Prof]** est confirmée"
- Date et heure : "📅 jeudi 16 janvier 2026 à 14:00"
- Durée : "⏱️ 60 minutes"
- Bouton : "Voir mon planning →"
- Détails de paiement

#### Étape 9 : Vérifier la base de données

```sql
-- 1. Transaction
SELECT
  id,
  payment_type,
  status,
  amount_eur,
  metadata->>'booking_id' as booking_id,
  created_at,
  completed_at
FROM transactions
WHERE payment_type = 'booking'
ORDER BY created_at DESC
LIMIT 1;

-- Résultat attendu :
-- payment_type: 'booking'
-- status: 'completed'
-- metadata contient booking_id
-- completed_at: date/heure du paiement

-- 2. Booking (mis à jour)
SELECT
  id,
  status,
  payment_id,
  live_session_id,
  scheduled_at,
  duration
FROM bookings
WHERE id = '<booking_id>';

-- Résultat attendu :
-- status: 'confirmed' (avant c'était 'pending')
-- payment_id: UUID de la transaction
-- live_session_id: UUID de la session live créée

-- 3. Live session créée
SELECT
  id,
  booking_id,
  classroom_id,
  scheduled_at,
  status
FROM live_sessions
WHERE booking_id = '<booking_id>';

-- Résultat attendu :
-- Une session créée avec status 'scheduled'
```

#### Étape 10 : Vérifier le planning

1. Étudiant : Naviguer vers `/student/schedule`
   - La session doit apparaître dans le calendrier

2. Professeur : Se connecter avec le compte professeur et aller sur `/teacher/schedule`
   - La session doit aussi apparaître

#### ✅ Critères de succès

- [ ] Page booking affiche les disponibilités correctement
- [ ] Sélection date/heure/durée fonctionne
- [ ] Prix calculé en temps réel (ex: 60min × 30€/h = 30€)
- [ ] Booking créé avec status 'pending'
- [ ] Redirection Stripe réussie
- [ ] Paiement accepté
- [ ] Webhook traité (200 OK)
- [ ] Transaction créée (payment_type: booking, status: completed)
- [ ] Booking status mis à jour (pending → confirmed)
- [ ] Live session créée
- [ ] Notifications envoyées (étudiant + professeur)
- [ ] Redirection vers /payment/success?booking_id=xxx
- [ ] Session visible dans les plannings

---

## 🔧 Tests de Cas d'Erreur

### Test 4 : Paiement refusé

**Carte de test pour paiement refusé :**
- `4000 0000 0000 0002` - Carte déclinée (insufficient funds)

**Résultat attendu :**
1. Stripe affiche une erreur "Your card was declined"
2. L'utilisateur peut réessayer avec une autre carte
3. Si l'utilisateur annule → redirection vers `cancel_url`
4. Exemple pour booking : `/book/<teacher_id>`

**Vérification DB :**
```sql
-- Le booking existe toujours avec status 'pending' (pas de paiement)
SELECT * FROM bookings WHERE id = '<booking_id>' AND status = 'pending';

-- Aucune transaction 'completed' n'existe pour ce booking
SELECT * FROM transactions WHERE metadata->>'booking_id' = '<booking_id>';
-- Résultat : vide ou status = 'failed'
```

### Test 5 : Webhook échoue (serveur down)

**Simuler avec Stripe CLI :**
```bash
# Arrêter le serveur npm run dev
# Dans Stripe Dashboard, déclencher un événement de test
```

**Résultat attendu :**
1. Stripe retry automatiquement le webhook (jusqu'à 72h)
2. Consulter Stripe Dashboard > Developers > Webhooks > [votre endpoint]
3. Voir les tentatives de retry

**Résolution :**
- Redémarrer le serveur
- Le prochain retry réussira

### Test 6 : Créneau déjà réservé (booking conflict)

**Scénario :**
1. Un étudiant démarre une réservation pour Prof X à 14h demain
2. Pendant qu'il remplit le formulaire Stripe, un autre étudiant complète une réservation pour le même créneau
3. Le premier étudiant soumet son paiement

**Résultat attendu :**
```json
{
  "error": "Ce créneau est déjà réservé",
  "status": 409
}
```

**Vérification :**
- L'API `/api/bookings` vérifie les conflits AVANT de créer la Stripe session
- La contrainte DB `idx_bookings_no_overlap` empêche les doublons

### Test 7 : Utilisateur annule le paiement

**Actions :**
1. Arriver sur Stripe Checkout
2. Cliquer sur "← Retour" (back button)

**Résultat attendu :**
- Redirection vers `cancel_url` :
  - Abonnement : `/#pricing`
  - Cours : `/checkout?classroom=xxx`
  - Booking : `/book/<teacher_id>`

**Vérification DB :**
- Aucune transaction créée
- Pour booking : status reste 'pending'

---

## 🌍 Tests Multi-Devises

### Test 8 : Paiement en TND (Tunisie)

**Simuler la géolocalisation tunisienne :**

Option A : Modifier temporairement `useGeoLocation.ts` pour forcer TND
```typescript
// Dans src/lib/payment/useGeoLocation.ts (ligne ~30)
const detectedCurrency = 'TND' // Force TND
const exchangeRate = 3.3
```

Option B : Utiliser un VPN tunisien (plus réaliste)

**Déroulement :**
1. Landing page → section pricing
2. Prix affiché : "Essai gratuit - 62,70 TND/mois" (19€ × 3.3)
3. Cliquer "Essai gratuit"
4. Checkout Stripe affiche 62,70 TND

**Carte de test tunisienne :**
- `4000 0027 6000 3184`

**Vérification DB :**
```sql
SELECT
  amount_eur,    -- 19.00
  amount_local,  -- 62.70
  currency,      -- 'TND'
  exchange_rate  -- 3.300000
FROM transactions
ORDER BY created_at DESC
LIMIT 1;
```

### Test 9 : Paiement en XOF (Sénégal, Côte d'Ivoire, etc.)

**Simuler XOF :**
```typescript
const detectedCurrency = 'XOF'
const exchangeRate = 655.96
```

**Arrondi spécial :**
- Prix brut : 19€ × 655.96 = 12463.24 XOF
- Arrondi au multiple de 25 : **12475 XOF**

**Carte de test :**
- `4000 0025 0000 3155`

**Vérification DB :**
```sql
SELECT
  amount_eur,    -- 19.00
  amount_local,  -- 12475.00 (arrondi au multiple de 25)
  currency       -- 'XOF'
FROM transactions
ORDER BY created_at DESC
LIMIT 1;
```

---

## 📊 Dashboard Stripe : Vérifications

### Vérifier les paiements

1. Aller sur [Stripe Dashboard](https://dashboard.stripe.com/test/payments)
2. Filtrer par statut "Succeeded"
3. Trouver vos paiements de test

**Détails à vérifier :**
- Montant correct
- Devise correcte
- Metadata présente :
  - `payment_type`
  - `student_id`, `teacher_id` (si applicable)
  - `classroom_id` ou `booking_id` (selon le type)
  - `amount_eur`, `amount_local`, `currency`, `exchange_rate`

### Vérifier les abonnements

1. Aller sur [Stripe Dashboard > Subscriptions](https://dashboard.stripe.com/test/subscriptions)
2. Trouver votre abonnement de test

**Détails à vérifier :**
- Status: "Active"
- Plan interval: "month"
- Current period end: date dans ~30 jours
- Customer email: email de test

### Vérifier les webhooks

1. Aller sur [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Cliquer sur votre endpoint webhook

**Événements à vérifier :**
- `checkout.session.completed` : ✓ Succeeded (200)
- `invoice.payment_succeeded` : ✓ Succeeded (si abonnement)

**Détails de la requête :**
- Request body contient l'objet Stripe complet
- Response status: 200
- Response time: < 5 secondes

---

## 🐛 Debugging : Problèmes Courants

### Problème 1 : Webhook non reçu

**Symptômes :**
- Paiement réussi dans Stripe
- Page de succès affiche "Transaction non trouvée"
- DB : aucune transaction créée

**Solutions :**
1. Vérifier que `stripe listen` est actif
2. Vérifier les logs du webhook dans Stripe CLI
3. Vérifier `STRIPE_WEBHOOK_SECRET` dans `.env.local`
4. Vérifier les logs serveur pour les erreurs

**Commande de debug :**
```bash
# Relancer l'événement manuellement
stripe events resend evt_xxx
```

### Problème 2 : Transaction en double

**Symptômes :**
- Erreur dans les logs : "Duplicate transaction"
- DB : contrainte unique violée sur `idempotency_key`

**Cause :**
- Webhook reçu plusieurs fois (retry de Stripe)

**Solution :**
- C'est normal ! Le système est protégé
- La contrainte unique empêche les doublons
- Vérifier que le webhook retourne 200 OK rapidement

### Problème 3 : Prix incorrect affiché

**Symptômes :**
- Landing page affiche toujours EUR alors que l'utilisateur est en Tunisie

**Solutions :**
1. Vérifier que `useGeoLocation` fonctionne :
   ```typescript
   const { paymentConfig, loading } = useGeoLocation()
   console.log('Payment config:', paymentConfig)
   ```

2. Vérifier la géolocalisation :
   ```bash
   curl https://ipapi.co/json/
   ```

3. Forcer temporairement une devise pour tester

### Problème 4 : Booking créé mais pas confirmé après paiement

**Symptômes :**
- Paiement réussi
- Booking status reste 'pending' au lieu de 'confirmed'

**Solutions :**
1. Vérifier les logs du webhook : erreur lors de `handleBookingConfirmation` ?
2. Vérifier la DB :
   ```sql
   SELECT * FROM transactions WHERE metadata->>'booking_id' = '<booking_id>';
   ```
   - Si transaction existe mais booking pas mis à jour → bug dans le webhook

3. Corriger manuellement (dev only) :
   ```sql
   UPDATE bookings
   SET status = 'confirmed', payment_id = '<transaction_id>'
   WHERE id = '<booking_id>';
   ```

---

## 📈 Métriques à Surveiller

### En production

1. **Taux de succès des paiements**
   ```sql
   SELECT
     payment_type,
     COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate
   FROM transactions
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY payment_type;
   ```

2. **Montant total traité par devise**
   ```sql
   SELECT
     currency,
     SUM(amount_local) as total_amount,
     COUNT(*) as transaction_count
   FROM transactions
   WHERE status = 'completed'
   AND created_at > NOW() - INTERVAL '30 days'
   GROUP BY currency;
   ```

3. **Temps de traitement des webhooks**
   - Vérifier dans Stripe Dashboard > Webhooks
   - Objectif : < 2 secondes

4. **Erreurs de paiement**
   ```sql
   SELECT
     payment_type,
     status,
     COUNT(*)
   FROM transactions
   WHERE status IN ('failed', 'cancelled')
   AND created_at > NOW() - INTERVAL '7 days'
   GROUP BY payment_type, status;
   ```

---

## ✅ Checklist Finale

Avant de déployer en production, vérifier :

### Configuration
- [ ] Variables d'environnement production configurées (STRIPE_SECRET_KEY, etc.)
- [ ] Webhook endpoint enregistré dans Stripe (production)
- [ ] URL de production dans `NEXT_PUBLIC_APP_URL`
- [ ] SSL/HTTPS activé (requis pour les webhooks)

### Base de données
- [ ] Toutes les tables créées (`transactions`, `bookings`, `subscriptions`, `plan_pricing`)
- [ ] RLS policies activées et testées
- [ ] Indexes créés pour les performances
- [ ] Contraintes uniques en place (idempotency_key, etc.)

### Tests
- [ ] Test 1 (Abonnement) ✓
- [ ] Test 2 (Achat de cours) ✓
- [ ] Test 3 (Booking 1-to-1) ✓
- [ ] Test 4 (Paiement refusé) ✓
- [ ] Test 5 (Webhook retry) ✓
- [ ] Test 6 (Booking conflict) ✓
- [ ] Test 7 (Annulation) ✓
- [ ] Test 8 (Multi-devises TND) ✓
- [ ] Test 9 (Multi-devises XOF) ✓

### Sécurité
- [ ] Webhook signature verification activée
- [ ] Montants validés côté serveur (jamais côté client)
- [ ] RLS empêche l'accès non autorisé aux transactions
- [ ] Rate limiting sur les endpoints de paiement
- [ ] Logs d'audit pour toutes les transactions

### Monitoring
- [ ] Alertes configurées pour webhook failures
- [ ] Alertes pour paiements échoués (>10 en 1h)
- [ ] Dashboard de métriques mis en place
- [ ] Logs centralisés (Sentry, LogRocket, etc.)

---

## 📞 Support

En cas de problème :

1. **Consulter les logs Stripe Dashboard** : [https://dashboard.stripe.com/test/logs](https://dashboard.stripe.com/test/logs)
2. **Consulter les logs Supabase** : Dashboard > Logs > API Logs
3. **Documentation Stripe** : [https://stripe.com/docs](https://stripe.com/docs)
4. **Tester avec Stripe CLI** : `stripe listen --events checkout.session.completed,invoice.payment_succeeded`

---

**Bon courage pour les tests ! 🚀**
