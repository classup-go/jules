# 🔍 AUDIT COMPLET DU SYSTÈME - 2026-01-24

**Statut** : ANALYSE EN COURS
**Priorité** : CRITIQUE
**Objectif** : Identifier et corriger tous les problèmes de logique métier

---

## 📊 PROBLÈMES IDENTIFIÉS

### 🚨 CRITIQUE : Prix affichés = 0€

**Symptômes** :
- Les cours s'affichent avec prix = 0€ sur la page classroom
- Bouton "Acheter ce cours" ne fonctionne pas ou invisible
- Base de données contient les bons prix (vérifié)

**Cause probable** :
1. Cache navigateur/serveur pas rafraîchi
2. Requête côté client ne récupère pas le champ `price`
3. Conversion de devise échoue silencieusement

**Fichiers concernés** :
- [src/app/(dashboard)/classroom/[id]/page.tsx](src/app/(dashboard)/classroom/[id]/page.tsx)

---

## 🔄 FLOWS À AUDITER

### 1. FLOW ÉTUDIANT (Student Journey)

```
1. Navigation
   ├─ /search → Rechercher des cours
   ├─ /classroom/[id] → Voir détails d'une classe et ses cours
   ├─ /checkout?course=[id] → Payer un cours
   ├─ /payment/success → Confirmation
   └─ /course/[id] → Accéder au cours acheté

2. États possibles d'un cours
   ├─ Non inscrit + Gratuit → S'inscrire directement
   ├─ Non inscrit + Payant → Bouton "Acheter"
   ├─ Inscrit → Bouton "Accéder au cours"
   └─ Propriétaire (prof) → Bouton "Gérer"
```

**Questions critiques** :
- [ ] La page `/classroom/[id]` charge-t-elle bien les cours avec leurs prix ?
- [ ] Le bouton "Acheter" s'affiche-t-il pour les cours payants ?
- [ ] La redirection vers checkout fonctionne-t-elle ?
- [ ] Le paiement Stripe est-il correctement déclenché ?

---

### 2. FLOW PROFESSEUR (Teacher Journey)

```
1. Création de contenu
   ├─ /teacher/classrooms/new → Créer une classe
   ├─ Wizard multi-étapes
   │  ├─ Step 1: Info classe
   │  ├─ Step 2: Objectifs
   │  ├─ Step 3: Premier cours + PRIX
   │  └─ Step 4: Contenu
   ├─ /teacher/courses/[id] → Gérer un cours
   └─ /teacher/courses/[id]/chapters/new → Ajouter des chapitres

2. Gestion
   ├─ /teacher/classrooms → Voir mes classes
   ├─ /teacher/courses → Voir mes cours
   └─ /teacher/earnings → Voir mes revenus
```

**Questions critiques** :
- [ ] La création de cours sauvegarde-t-elle bien le prix ?
- [ ] La devise est-elle correctement convertie en EUR ?
- [ ] Le professeur peut-il voir ses cours après création ?
- [ ] Les étudiants inscrits sont-ils trackés correctement ?

---

### 3. FLOW PAIEMENT (Payment Flow)

```
1. Flow actuel (à vérifier)
   Étudiant → Clique "Acheter"
   ↓
   /checkout?course=[id]
   ↓
   Affiche récapitulatif + prix
   ↓
   Clique "Confirmer inscription"
   ↓
   API /api/checkout
   ↓
   Crée Stripe Session
   ↓
   Redirect vers Stripe Hosted Checkout
   ↓
   Étudiant entre sa carte
   ↓
   Stripe webhook → /api/webhook/stripe
   ↓
   Crée enrollment + transaction
   ↓
   Redirect vers /payment/success
   ↓
   Étudiant accède au cours
```

**Points de vérification** :
- [ ] Le bouton "Acheter" appelle-t-il `/checkout?course=ID` ou autre chose ?
- [ ] L'API `/api/checkout` retourne-t-elle une URL Stripe ?
- [ ] Le webhook Stripe crée-t-il bien l'enrollment avec course_id ?
- [ ] L'étudiant peut-il accéder au cours après paiement ?

---

## 🗄️ STRUCTURE BASE DE DONNÉES

### Tables principales

**classrooms** (Classes)
```sql
- id
- title
- teacher_id
- subject, level
- enrolled_count  -- Nombre total d'inscrits (peut être déprécié)
```

**courses** (Cours dans une classe)
```sql
- id
- classroom_id
- title
- description
- price              -- ⚠️ EN EUR (devise de base)
- access_type        -- 'free' | 'premium'
- enrolled_count     -- Nombre d'inscrits à CE cours
- teacher_id
```

**enrollments** (Inscriptions)
```sql
- id
- student_id
- classroom_id       -- Classe parente
- course_id          -- ⚠️ NOUVEAU : Cours spécifique acheté
- payment_id
- status
```

**transactions** (Paiements)
```sql
- id
- student_id
- teacher_id
- amount_eur         -- Prix en EUR
- amount_local       -- Prix en devise locale
- currency           -- TND, EUR, XOF, etc.
- status             -- 'completed', 'pending', 'failed'
- metadata           -- course_id, classroom_id, etc.
```

---

## 🐛 BUGS IDENTIFIÉS

### BUG #1 : Prix = 0€ affiché (CRITIQUE)

**Localisation** : [src/app/(dashboard)/classroom/[id]/page.tsx:316-318](src/app/(dashboard)/classroom/[id]/page.tsx#L316-L318)

**Code actuel** :
```tsx
const isFree = course.access_type === 'free' || course.price === 0
const priceInUserCurrency = paymentConfig ? convertPrice(course.price, paymentConfig) : course.price
const formattedPrice = paymentConfig ? formatPrice(priceInUserCurrency, paymentConfig) : `${course.price}€`
```

**Problème possible** :
- `course.price` est undefined ou null
- `paymentConfig` est null
- Conversion échoue silencieusement

**Vérification nécessaire** :
```sql
-- Vérifier que les prix sont bien en base
SELECT id, title, price, access_type
FROM courses
LIMIT 5;
```

---

### BUG #2 : Requête ne récupère pas le prix

**Localisation** : [src/app/(dashboard)/classroom/[id]/page.tsx:120-133](src/app/(dashboard)/classroom/[id]/page.tsx#L120-L133)

**Code actuel** :
```tsx
const { data: coursesData } = await supabase
  .from('courses')
  .select(`
    id,
    title,
    description,
    price,              // ⚠️ Est-ce bien récupéré ?
    access_type,
    enrolled_count,
    learning_objectives,
    prerequisites
  `)
  .eq('classroom_id', id)
  .order('created_at', { ascending: true })
```

**À vérifier** :
- Le champ `price` existe-t-il dans la table ?
- Les RLS policies autorisent-elles la lecture du prix ?
- Y a-t-il une erreur SQL silencieuse ?

---

### BUG #3 : Bouton "Acheter" invisible ou non cliquable

**Localisation** : [src/app/(dashboard)/classroom/[id]/page.tsx:400-407](src/app/(dashboard)/classroom/[id]/page.tsx#L400-L407)

**Code actuel** :
```tsx
) : (
  <Link
    href={`/checkout?course=${course.id}`}
    style={{ display: 'block', width: '100%', padding: '12px', backgroundColor: '#2b8cee', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: '600', textAlign: 'center', fontSize: '14px' }}
  >
    💳 Acheter ce cours - {formattedPrice}
  </Link>
)}
```

**Conditions pour afficher le bouton** :
1. `!isEnrolled` (pas déjà inscrit)
2. `currentUserId !== classroom.teacher_id` (pas le prof)
3. `currentUserId` existe (connecté)
4. `!isFree` (cours payant)

**À vérifier** :
- Ces conditions sont-elles toutes remplies ?
- Le lien est-il bien généré ?

---

### BUG #4 : Migration 006 non exécutée ?

**Fichier** : [migrations/006-course-level-enrollment.sql](migrations/006-course-level-enrollment.sql)

**Contenu critique** :
- Ajoute `enrollments.course_id`
- Ajoute `courses.enrolled_count`
- Crée les triggers

**⚠️ SI NON EXÉCUTÉE** :
- Les enrollments n'ont pas de `course_id`
- Impossible de tracker qui a acheté quel cours
- Les compteurs ne fonctionnent pas

**Vérification** :
```sql
-- Vérifier si course_id existe
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'enrollments'
AND column_name = 'course_id';
```

---

## 🎯 PLAN D'ACTION

### Phase 1 : DIAGNOSTIC (15 min)

1. **Vérifier la base de données**
   ```sql
   -- Les prix sont-ils en base ?
   SELECT id, title, price, access_type FROM courses LIMIT 5;

   -- La colonne course_id existe-t-elle ?
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'enrollments';
   ```

2. **Vérifier le code frontend**
   - Ouvrir [src/app/(dashboard)/classroom/[id]/page.tsx](src/app/(dashboard)/classroom/[id]/page.tsx)
   - Ajouter des `console.log` pour voir les données
   - Vérifier si `course.price` est défini

3. **Vérifier le serveur**
   - Le serveur dev est-il redémarré ?
   - Y a-t-il des erreurs dans la console serveur ?

---

### Phase 2 : CORRECTIONS IMMÉDIATES (30 min)

#### Fix #1 : Forcer le rechargement des prix

**Fichier** : [src/app/(dashboard)/classroom/[id]/page.tsx](src/app/(dashboard)/classroom/[id]/page.tsx)

**Ajouter logs de debug** :
```tsx
if (coursesData && coursesData.length > 0) {
  console.log('🔍 Courses loaded:', coursesData)
  coursesData.forEach(c => {
    console.log(`Course: ${c.title}, Price: ${c.price}, Type: ${c.access_type}`)
  })
  // ...
}
```

#### Fix #2 : Valeurs par défaut de sécurité

```tsx
const isFree = course.access_type === 'free' || !course.price || course.price === 0
const priceInUserCurrency = (paymentConfig && course.price)
  ? convertPrice(course.price, paymentConfig)
  : (course.price || 0)
```

#### Fix #3 : Exécuter la migration

```bash
# Dans Supabase SQL Editor
\i migrations/006-course-level-enrollment.sql
```

---

### Phase 3 : REFACTORING (2h)

#### Créer une structure claire

**Nouveau fichier** : `src/lib/business-logic/course-access.ts`
```typescript
export function canAccessCourse(
  course: Course,
  userId: string | null,
  enrollments: Enrollment[]
): {
  canAccess: boolean
  reason: 'enrolled' | 'owner' | 'free' | 'must_purchase' | 'not_logged_in'
  action: 'access' | 'purchase' | 'enroll_free' | 'login' | 'manage'
} {
  // Logique centralisée et testable
}
```

**Avantages** :
- Logique métier centralisée
- Facile à tester
- Cohérence garantie

---

## 📝 CHECKLIST AVANT DÉPLOIEMENT

- [ ] Migration 006 exécutée
- [ ] Serveur redémarré
- [ ] Prix affichés correctement
- [ ] Bouton "Acheter" visible pour cours payants
- [ ] Flow de paiement testé de bout en bout
- [ ] Webhook Stripe configuré
- [ ] Logs de debug retirés

---

## 🚀 TESTS À EFFECTUER

### Test 1 : Affichage des prix
1. Aller sur `/classroom/[id]`
2. Vérifier que les prix s'affichent
3. Vérifier la conversion de devise

### Test 2 : Achat d'un cours
1. Cliquer "Acheter ce cours"
2. Vérifier redirect vers `/checkout?course=ID`
3. Vérifier récapitulatif avec prix
4. Cliquer "Confirmer"
5. Vérifier redirect vers Stripe
6. Payer avec carte test : 4242 4242 4242 4242
7. Vérifier redirect vers `/payment/success`
8. Vérifier accès au cours

### Test 3 : Création de cours
1. Créer un nouveau cours avec prix
2. Vérifier que le prix est sauvegardé en EUR
3. Vérifier affichage sur la page classroom

---

## 📞 QUESTIONS À RÉPONDRE

1. **Quelle page voit l'étudiant en premier ?**
   - `/search` ? `/dashboard` ? Autre ?

2. **Un étudiant peut-il acheter UN cours sans acheter toute la classe ?**
   - OUI (c'est ce qu'on implémente)

3. **Que se passe-t-il si un étudiant achète le cours 2 avant le cours 1 ?**
   - Il a accès uniquement au cours 2
   - Les cours sont indépendants

4. **Un professeur peut-il avoir des cours gratuits ET payants dans la même classe ?**
   - OUI
   - C'est défini par `course.access_type` et `course.price`

---

## 🎯 OBJECTIF FINAL

**Un système cohérent où** :
1. ✅ Les prix s'affichent correctement
2. ✅ Un étudiant peut acheter un cours spécifique
3. ✅ Le paiement passe par Stripe
4. ✅ L'accès au cours est donné après paiement vérifié
5. ✅ Le professeur reçoit son argent (avec fees de plateforme)
6. ✅ Les statistiques sont trackées correctement

---

*Audit en cours... À compléter après diagnostic*
