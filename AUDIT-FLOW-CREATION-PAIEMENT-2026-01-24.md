# AUDIT COMPLET : FLOW CRÉATION DE CLASSE/COURS ET PAIEMENT

**Date**: 2026-01-24
**Criticité**: ÉLEVÉE - Plusieurs bugs critiques bloquant les paiements
**Impact**: Les utilisateurs ne peuvent pas payer et les professeurs ne peuvent pas définir correctement les prix

---

## 🔴 PROBLÈMES CRITIQUES IDENTIFIÉS

### 1. INCOHÉRENCE MAJEURE : LOGIQUE MÉTIER CLASSE vs COURS

#### Problème
Le code mélange deux modèles incompatibles :
- **Dans l'interface** : On paye une CLASSE (voir [checkout/page.tsx:73-88](src/app/(dashboard)/checkout/page.tsx#L73-L88))
- **Dans la création** : Le prix est défini sur le COURS (voir [Step3FirstCourse.tsx:171-192](src/components/class-wizard/steps/Step3FirstCourse.tsx#L171-L192))
- **Dans l'affichage** : Le prix vient de la CLASSE (voir [classroom/[id]/page.tsx:395-397](src/app/(dashboard)/classroom/[id]/page.tsx#L395-L397))

#### Impact
```
Professeur crée un cours → Définit prix = 30 TND
↓
Prix sauvegardé dans table 'courses'
↓
Étudiant va sur la page de classe
↓
Code cherche classroom.price → TOUJOURS 0 ou NULL (prix pas dans classrooms!)
↓
Affichage : "Gratuit" ou "0€"
↓
Paiement bypassé, inscription gratuite
```

#### Fichiers concernés
- [src/app/(dashboard)/checkout/page.tsx](src/app/(dashboard)/checkout/page.tsx) - ligne 83-88 : lit `classroom.price`
- [src/app/(dashboard)/classroom/[id]/page.tsx](src/app/(dashboard)/classroom/[id]/page.tsx) - ligne 395-397 : affiche `classroom.price`
- [src/components/class-wizard/ClassWizard.tsx](src/components/class-wizard/ClassWizard.tsx) - ligne 268 : envoie le prix dans `courses`
- [src/app/api/classes/route.ts](src/app/api/classes/route.ts) - ligne 48-65 : N'insère PAS de prix pour classrooms

---

### 2. DEVISE CODÉE EN DUR (TND)

#### Problème
Le formulaire de création de cours affiche "TND" en dur alors que le système supporte le multi-devises :

**Fichier** : [src/components/class-wizard/steps/Step3FirstCourse.tsx](src/components/class-wizard/steps/Step3FirstCourse.tsx)
```tsx
// Ligne 190
<span style={{...}}>TND</span>  // ❌ DEVISE CODÉE EN DUR
```

#### Impact
1. Le professeur voit "TND" mais le prix est sauvegardé sans information de devise
2. Le système suppose que tous les prix sont en EUR (voir [config.ts:2-3](src/lib/payment/config.ts#L2-L3))
3. Quand l'étudiant arrive sur checkout, la devise détectée est appliquée mais le prix de base est incohérent

#### Scénario buggé
```
Professeur en Tunisie → Voit "TND" → Entre 30
↓
Sauvegardé : price = 30 (sans devise)
↓
Système suppose : 30 EUR (devise de base)
↓
Étudiant tunisien checkout → 30 EUR × 3.35 = 100.5 TND
❌ Prix multiplié par erreur !
```

---

### 3. BYPASS COMPLET DU CHECKOUT STRIPE

#### Problème
Le paiement va directement au succès sans passer par Stripe :

**Fichier** : [src/app/(dashboard)/checkout/page.tsx](src/app/(dashboard)/checkout/page.tsx)
```tsx
// Ligne 176-209 : handlePayment
const response = await fetch('/api/enrollment/create', {
  method: 'POST',
  // ...
})
// ❌ Appelle directement l'API d'enrollment
// ✅ Devrait appeler /api/checkout pour créer session Stripe
```

**Fichier** : [src/app/api/enrollment/create/route.ts](src/app/api/enrollment/create/route.ts)
```tsx
// Ligne 94-95
status: 'completed',  // ❌ DIRECTEMENT COMPLETED
completed_at: new Date().toISOString(),
```

#### Impact
```
User clique "Payer"
→ /api/enrollment/create
→ Transaction marquée 'completed' instantanément
→ Enrollment créé
→ Redirect vers /payment/success
❌ AUCUN PAIEMENT RÉEL !
```

#### Ce qui devrait se passer
```
User clique "Payer"
→ /api/checkout
→ Crée Stripe Checkout Session
→ Redirect vers Stripe hosted page
→ User entre carte bancaire
→ Stripe webhook /api/webhook/stripe
→ Transaction marquée 'completed'
→ Enrollment créé
→ Redirect vers /payment/success
```

---

### 4. PRIX AFFICHÉ = 0 LORS DE LA CRÉATION

#### Problème
Lors de la création d'une classe payante, le prix affiché est 0 même si le professeur définit un prix.

#### Cause racine
Le prix est défini sur le **cours**, mais affiché depuis la **classe** :

1. **Création** : [ClassWizard.tsx:268](src/components/class-wizard/ClassWizard.tsx#L268)
   ```tsx
   // Prix envoyé dans courses
   price: data.first_course.is_free ? 0 : (data.first_course.price || 0)
   ```

2. **API classes** : [src/app/api/classes/route.ts:48-65](src/app/api/classes/route.ts#L48-L65)
   ```tsx
   // PAS de champ 'price' inséré dans classrooms
   const insertData = {
     teacher_id: user.id,
     title: body.title.trim(),
     subject: body.subject,
     level: body.level,
   }
   ```

3. **Affichage** : [classroom/[id]/page.tsx:395](src/app/(dashboard)/classroom/[id]/page.tsx#L395)
   ```tsx
   {(classroom.is_free || classroom.price === 0) ? 'Gratuit' : `${classroom.price}€`}
   // ❌ classroom.price est toujours NULL ou 0
   ```

---

## 📊 ANALYSE DE LA STRUCTURE ACTUELLE

### Modèle de données

```
┌─────────────────┐
│   classrooms    │  ← Conteneur (Classe)
├─────────────────┤
│ id              │
│ teacher_id      │
│ title           │
│ subject         │
│ level           │
│ description     │
│ is_public       │
│ enrolled_count  │
│ ❌ PAS de price │  ← PROBLÈME !
│ ❌ PAS de is_free│  ← PROBLÈME !
└─────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────┐
│     courses     │  ← Contenu (Cours)
├─────────────────┤
│ id              │
│ classroom_id    │ (FK)
│ title           │
│ description     │
│ ✅ price        │  ← Prix ici
│ ✅ access_type  │  ← 'free' ou 'premium'
│ learning_obj... │
│ prerequisites   │
│ settings (JSONB)│
└─────────────────┘
```

### Le problème conceptuel

**Question fondamentale** : Est-ce qu'on paye pour une CLASSE ou pour un COURS ?

#### Option A : Payer la CLASSE (modèle abonnement)
- ✅ Une classe = plusieurs cours
- ✅ User paye une fois, accès à tous les cours de la classe
- ❌ Ne permet pas de vendre des cours individuels

#### Option B : Payer chaque COURS (modèle à l'unité)
- ✅ Flexibilité max : chaque cours peut avoir son prix
- ✅ User achète uniquement ce qui l'intéresse
- ❌ Plus complexe : multiple enrollments, multiple transactions

#### Option C : MIXTE (actuel mais cassé)
- Le code mélange les deux sans cohérence
- Checkout lit depuis `classrooms`
- Création écrit dans `courses`
- Résultat : prix = 0, paiements bypassés

---

## 🔍 FLOW ACTUEL (BUGGÉ)

### 1. Création de classe/cours

```
Professeur → /teacher/classes/create
↓
<ClassWizard />
↓
Mode selection (nouvelle classe | classe existante)
↓
Step 1: Infos classe (titre, matière, niveau)
↓
Step 2: Objectifs pédagogiques
↓
Step 3: Premier cours
├─ Titre du cours
├─ Description
├─ Gratuit / Payant
└─ Si payant → Prix (affiché en "TND" ❌)
    └─ Pas de sélection de devise ❌
↓
Step 4: Contenu initial
↓
Submit →
├─ POST /api/classes
│  └─ Crée classroom (SANS prix ❌)
│
└─ POST /api/courses
   └─ Crée course (AVEC prix mais sans devise ❌)
```

**BUGS** :
- Prix défini sur le cours, pas la classe
- Devise "TND" affichée mais pas sauvegardée
- Pas de notion de devise dans le modèle

### 2. Page de détails classe

```
Étudiant → /classroom/{id}
↓
Fetch classroom data
├─ classroom.price ← ❌ TOUJOURS NULL ou 0
├─ classroom.is_free ← ❌ TOUJOURS NULL
└─ Ne lit PAS courses.price
↓
Affichage :
if (classroom.is_free || classroom.price === 0)
  → "Gratuit" ❌ (même si cours payant)
else
  → Prix de la classe (qui n'existe pas)
↓
Bouton : "S'inscrire gratuitement" ou "S'inscrire pour X€"
```

**BUG** : Le prix du cours n'est jamais lu ni affiché

### 3. Page Checkout

```
Étudiant → /checkout?classroom={id}
↓
Fetch classroom.price ← ❌ NULL ou 0
↓
if (classroom.is_free || classroom.price === 0)
  → Créer enrollment gratuit immédiatement
  → Redirect /payment/success?free=true
  → FIN (bypass complet)
else
  → Afficher formulaire paiement
  → Géolocalisation → Devise locale
  → Conversion prix (mais prix = 0 ❌)
  → Méthodes de paiement
↓
User clique "Confirmer"
↓
POST /api/enrollment/create ← ❌ PAS /api/checkout
├─ Crée transaction status='completed' ❌
├─ Crée enrollment
└─ Redirect /payment/success
```

**BUGS** :
- Lit `classroom.price` qui n'existe pas
- Bypass complet si prix = 0
- N'appelle jamais `/api/checkout` (Stripe)
- Crée transaction "completed" sans paiement réel

### 4. API Checkout (JAMAIS APPELÉE)

```
POST /api/checkout
├─ Reçoit classroomId, currency, exchangeRate
├─ Fetch classroom.price ← ❌ NULL
├─ Crée Stripe Checkout Session
└─ Return session.url
```

**PROBLÈME** : Cette route existe mais n'est jamais utilisée !

---

## 🐛 BUGS DÉTAILLÉS PAR FICHIER

### 1. [src/app/api/classes/route.ts](src/app/api/classes/route.ts)

**Ligne 48-65** : Insertion classroom sans prix
```tsx
const insertData: Record<string, any> = {
  teacher_id: user.id,
  title: body.title.trim(),
  subject: body.subject,
  level: body.level,
}
// ❌ Manque : price, is_free, currency
```

**Solution** :
- Soit ajouter `price`, `is_free`, `currency` dans classrooms
- Soit changer la logique pour lire depuis courses

### 2. [src/components/class-wizard/ClassWizard.tsx](src/components/class-wizard/ClassWizard.tsx)

**Ligne 225-243** : Création classroom sans prix
```tsx
const classResponse = await fetch('/api/classes', {
  method: 'POST',
  body: JSON.stringify({
    title: data.class_name,
    subject: data.subject,
    level: data.level,
    is_public: data.is_public,
    // ❌ Manque le prix !
  })
})
```

**Ligne 253-270** : Prix envoyé dans courses
```tsx
const courseResponse = await fetch('/api/courses', {
  method: 'POST',
  body: JSON.stringify({
    // ...
    price: data.first_course.is_free ? 0 : (data.first_course.price || 0),
    // ✅ Prix ici mais devrait être dans classroom
  })
})
```

### 3. [src/components/class-wizard/steps/Step3FirstCourse.tsx](src/components/class-wizard/steps/Step3FirstCourse.tsx)

**Ligne 190** : Devise codée en dur
```tsx
<span style={{...}}>TND</span>  // ❌ Pas dynamique
```

**Solution** :
- Utiliser `useGeoLocation()` pour détecter la devise
- Afficher la devise dynamique
- OU mieux : demander au professeur de choisir la devise

### 4. [src/app/(dashboard)/checkout/page.tsx](src/app/(dashboard)/checkout/page.tsx)

**Ligne 83-88** : Lit classroom.price (qui n'existe pas)
```tsx
const { data: classroomData } = await supabase
  .from('classrooms')
  .select('*')
  .eq('id', classroomId)
  .single()

if (classroomData) {
  if (classroomData.is_free || classroomData.price === 0) {
    // ❌ is_free et price n'existent pas dans classrooms
```

**Ligne 176-209** : N'appelle pas Stripe
```tsx
const response = await fetch('/api/enrollment/create', {
  // ❌ Devrait être /api/checkout
```

### 5. [src/app/api/enrollment/create/route.ts](src/app/api/enrollment/create/route.ts)

**Ligne 84-104** : Marque transaction completed immédiatement
```tsx
const { data: transaction, error: transactionError } = await supabaseAdmin
  .from('transactions')
  .insert({
    // ...
    status: 'completed',  // ❌ Sans paiement réel !
    completed_at: new Date().toISOString(),
  })
```

**Solution** : Cette route ne devrait être appelée que par le webhook Stripe

### 6. [src/app/(dashboard)/classroom/[id]/page.tsx](src/app/(dashboard)/classroom/[id]/page.tsx)

**Ligne 395-397** : Affiche classroom.price (NULL)
```tsx
<p style={{...}}>
  {(classroom.is_free || classroom.price === 0) ? 'Gratuit' : `${classroom.price}€`}
</p>
// ❌ classroom.price n'existe pas
```

**Ligne 426-428** : Lien checkout avec classroom
```tsx
<Link href={`/checkout?classroom=${classroom.id}`}>
  💳 S'inscrire pour {classroom.price}€
</Link>
// ❌ Prix incorrect
```

---

## ✅ RECOMMANDATIONS

### Option A : PAIEMENT PAR CLASSE (Recommandé)

**Avantages** :
- ✅ Modèle simple : 1 paiement = accès à tous les cours de la classe
- ✅ Cohérent avec le concept de "classe"
- ✅ Moins de transactions
- ✅ Meilleure expérience utilisateur

**Modifications nécessaires** :

1. **Ajouter colonnes à `classrooms`** :
   ```sql
   ALTER TABLE classrooms
   ADD COLUMN price DECIMAL(10,2) DEFAULT 0,
   ADD COLUMN is_free BOOLEAN DEFAULT false,
   ADD COLUMN currency VARCHAR(3) DEFAULT 'EUR';
   ```

2. **Modifier le wizard** :
   - Demander le prix de la classe (pas du cours)
   - Sélecteur de devise
   - Envoyer prix dans `POST /api/classes`

3. **Modifier checkout** :
   - Garder la lecture depuis `classroom.price`
   - Appeler `/api/checkout` pour créer Stripe session
   - Rediriger vers Stripe hosted page

4. **Modifier courses** :
   - Les cours héritent le prix de leur classe
   - `courses.price` devient optionnel (override si besoin)

### Option B : PAIEMENT PAR COURS

**Avantages** :
- ✅ Flexibilité max
- ✅ Permet vente à l'unité
- ✅ Permet cours gratuits + payants dans même classe

**Inconvénients** :
- ❌ Plus complexe
- ❌ Multiple enrollments
- ❌ UX plus lourde

**Modifications nécessaires** :

1. **Changer la page classroom** :
   - Afficher le prix de chaque cours
   - Bouton "S'inscrire" par cours
   - Checkout redirige vers le cours spécifique

2. **Modifier checkout** :
   - Prendre `course_id` au lieu de `classroom_id`
   - Lire `courses.price`
   - Enrollment vers le cours, pas la classe

3. **Modifier enrollment** :
   - Table `course_enrollments` au lieu de `enrollments`
   - Relation student → course (pas student → classroom)

---

## 🚀 PLAN D'ACTION IMMÉDIAT

### Phase 1 : FIX CRITIQUE (Option A - Paiement par classe)

1. **Migration base de données** ✅
   ```sql
   -- Ajouter colonnes à classrooms
   ALTER TABLE classrooms
   ADD COLUMN price DECIMAL(10,2) DEFAULT 0,
   ADD COLUMN is_free BOOLEAN DEFAULT true,
   ADD COLUMN currency VARCHAR(3) DEFAULT 'EUR';

   -- Migrer les prix du premier cours vers la classe
   UPDATE classrooms c
   SET
     price = (
       SELECT co.price
       FROM courses co
       WHERE co.classroom_id = c.id
       ORDER BY co.created_at
       LIMIT 1
     ),
     is_free = (
       SELECT co.access_type = 'free'
       FROM courses co
       WHERE co.classroom_id = c.id
       ORDER BY co.created_at
       LIMIT 1
     );
   ```

2. **Modifier API /api/classes** ✅
   ```tsx
   // Ajouter dans insertData
   if (body.price !== undefined) insertData.price = body.price
   if (body.is_free !== undefined) insertData.is_free = body.is_free
   if (body.currency) insertData.currency = body.currency
   ```

3. **Modifier ClassWizard** ✅
   - Déplacer le prix de Step3 (cours) vers Step1 (classe)
   - Ajouter sélecteur de devise
   - Envoyer prix dans `POST /api/classes`

4. **Fixer le flow checkout** ✅
   ```tsx
   // Dans handlePayment
   if (classroom.is_free || classroom.price <= 0) {
     // Enrollment gratuit
   } else {
     // Appeler /api/checkout pour créer Stripe session
     const response = await fetch('/api/checkout', {
       method: 'POST',
       body: JSON.stringify({
         classroomId,
         currency: paymentConfig.currency,
         exchangeRate: paymentConfig.exchangeRate
       })
     })
     const { url } = await response.json()
     window.location.href = url // Redirect vers Stripe
   }
   ```

5. **Implémenter webhook Stripe** ✅
   - Seule route autorisée à marquer transaction "completed"
   - Créer enrollment après paiement vérifié

### Phase 2 : AMÉLIORATION DEVISE

1. **Sélecteur de devise dans création** ✅
   - Dropdown avec EUR, TND, USD, XOF
   - Affichage du symbole dynamique
   - Validation du prix selon la devise

2. **Préférences utilisateur** ✅
   - Sauvegarder pays/devise dans `users` table
   - Pré-remplir selon préférences

3. **API taux de change** (optionnel)
   - Intégrer exchangerate-api.com
   - Actualiser taux quotidiennement

### Phase 3 : TESTS

1. **Tests critiques** :
   - ✅ Création classe gratuite
   - ✅ Création classe payante TND
   - ✅ Création classe payante EUR
   - ✅ Checkout classe gratuite (direct enrollment)
   - ✅ Checkout classe payante (redirect Stripe)
   - ✅ Webhook Stripe (payment success)
   - ✅ Affichage prix correct page classroom

---

## 📝 NOTES TECHNIQUES

### Devise de base : EUR

Tous les prix en DB sont stockés en EUR (devise de base). La conversion se fait côté client selon la géolocalisation :

```tsx
// Prix en DB : 30 EUR
// User tunisien : 30 × 3.35 = 100.5 TND
// User FCFA : 30 × 655.96 = 19,679 FCFA (arrondi 19,700)
```

### Taux de change

Actuellement codés en dur dans [config.ts](src/lib/payment/config.ts) :
```tsx
EUR: 1        // Base
TND: 3.35     // À actualiser
XOF: 655.96   // Fixe BCE
USD: 1.08     // À actualiser
```

**Recommandation** : Intégrer API temps réel pour TND et USD

---

## 🎯 CONCLUSION

Le système actuel présente des **bugs critiques** qui empêchent complètement les paiements :

1. ❌ Prix défini sur `courses` mais lu depuis `classrooms`
2. ❌ Devise codée en dur (TND) sans logique de sauvegarde
3. ❌ Bypass complet du système Stripe
4. ❌ Transactions marquées "completed" sans paiement réel

**Impact business** :
- 🚫 Impossible de vendre des cours
- 🚫 Tous les cours apparaissent gratuits
- 🚫 Professeurs perdent des revenus

**Priorité** : URGENTE - À corriger immédiatement avant mise en production
