# 🔍 AUDIT COMPLET - PLATEFORME JULES
**Date**: 28 janvier 2026
**Statut**: ⚠️ **MOYEN** - Fonctionne mais fragile

---

## 📊 RÉSUMÉ EXÉCUTIF

Plateforme éducative multi-rôles (Teacher/Student) avec système de paiement multi-devises. L'architecture est **solide** mais présente des **incohérences critiques** issues de refactorings successifs.

### Santé Globale
```
✅ Points forts:  Architecture Next.js/Supabase solide, Types TypeScript, Multi-provider
⚠️  Points faibles: 2 systèmes parallèles, confusion classroom_id/course_id, duplication
🔴 Risques:       Données orphelines, RLS bypass potentiel, pricing incohérent
```

---

## 1. PROBLÈMES CRITIQUES (Action Immédiate)

### 🔴 P1: Deux systèmes de création cours coexistent

**Impact**: Confusion utilisateur, données incohérentes

```
ANCIEN (Déprécié):
/teacher/classrooms/new → Sans settings JSONB
├─ 3 étapes simplifiées
└─ Course créé INCOMPLET (pas de duration, pacing, etc.)

NOUVEAU (Correct):
/teacher/classes/create → Avec settings JSONB
├─ 4 étapes complètes
└─ Course avec settings valides
```

**Action requise**:
- [ ] Désactiver `/teacher/classrooms/new`
- [ ] Rediriger vers `/teacher/classes/create`
- [ ] Ou supprimer le fichier complètement

**Fichiers concernés**:
- [src/app/(dashboard)/teacher/classrooms/new/page.tsx](src/app/(dashboard)/teacher/classrooms/new/page.tsx)
- [src/components/class-wizard/](src/components/class-wizard/)

---

### 🔴 P2: Confusion classroom_id vs course_id

**Impact**: Étudiants ne voient pas les cours achetés (bug récemment fixé)

```
enrollments table a DEUX colonnes:
├─ classroom_id (ancien système)
└─ course_id (nouveau système)

chapters table utilise:
└─ course_id (pas classroom_id!)

Problème: Queries cherchent parfois par classroom_id
→ Résultat: 0 chapitres trouvés
```

**Bugs déjà fixés** (2026-01-28):
- ✅ [src/app/(dashboard)/student/my-courses/page.tsx](src/app/(dashboard)/student/my-courses/page.tsx)
- ✅ [src/app/(dashboard)/learn/[classroomId]/page.tsx](src/app/(dashboard)/learn/[classroomId]/page.tsx)
- ✅ [src/app/(dashboard)/student/dashboard/page.tsx](src/app/(dashboard)/student/dashboard/page.tsx)

**Action requise**:
- [ ] Audit: Chercher autres usages de `chapters.classroom_id`
- [ ] Migration: Nettoyer les enrollments avec classroom_id null
- [ ] Tests: Vérifier que tous les students voient leurs cours

**Fichiers à vérifier**:
```bash
# Chercher les usages problématiques:
grep -r "\.eq('classroom_id'" src/app/
grep -r "chapters.*classroom_id" src/
```

---

### 🔴 P3: Migrations 007 dupliquées

**Impact**: Confusion versioning, risque de conflits DB

```
migrations/
├─ 007-complete-profile.sql
├─ 007-complete-profile-fixed.sql
└─ 007-complete-profile-all-users.sql
```

**Action requise**:
- [ ] Vérifier quelle version a été appliquée en DB
- [ ] Merger en une seule migration finale
- [ ] Nettoyer les fichiers inutilisés

---

### ⚠️ P4: RLS Policies (Récemment fixé)

**Impact**: Students ne pouvaient pas voir les prix avant d'acheter

**Ancien policy** (restrictif):
```sql
-- ❌ Students can only see courses they're enrolled in
CREATE POLICY "Students can view published courses"
ON courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM enrollments
    WHERE enrollments.course_id = courses.id
    AND enrollments.student_id = auth.uid()
  )
);
```

**Nouveau policy** (correct):
```sql
-- ✅ Anyone can see public courses OR enrolled courses
CREATE POLICY "Anyone can view public classroom courses"
ON courses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM classrooms c
    WHERE c.id = courses.classroom_id
    AND (
      c.is_public = true           -- Public = tout le monde
      OR c.teacher_id = auth.uid() -- Ou proprio
    )
  )
  OR EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.course_id = courses.id
    AND e.student_id = auth.uid()  -- Ou enrolled
  )
);
```

**Status**: ✅ Fix appliqué via [FIX-RLS-POLICIES-FINAL.sql](FIX-RLS-POLICIES-FINAL.sql)

**Action requise**:
- [ ] Vérifier que le fix a été appliqué en production
- [ ] Tester: Student peut voir prix avant d'acheter
- [ ] Tester: Teacher peut éditer ses cours

---

## 2. ARCHITECTURE GLOBALE

### Stack Technique
```
Frontend:
├─ Next.js 16.0.10 (App Router)
├─ React 19.2.1
├─ TypeScript 5
├─ Tailwind CSS + Radix UI
└─ React Query (TanStack)

Backend:
├─ Supabase (Auth + DB + Storage)
├─ Stripe (Paiements Europe)
├─ Konnect (Tunisie)
├─ Flouci (Tunisie)
└─ CinetPay (Afrique de l'Ouest)

Vidéo:
└─ LiveKit (Sessions live)
```

### Structure Routes
```
/teacher/
├─ classrooms/         → Gérer classes
├─ classes/create      → Créer nouvelle classe (NOUVEAU)
├─ courses/            → Gérer programmes
├─ lessons/[id]        → Éditeur leçon
└─ sessions/           → Sessions live

/student/
├─ my-courses          → Cours achetés
├─ assignments         → Devoirs
├─ homework            → Devoirs (doublon?)
└─ dashboard           → Tableau de bord

/course/[id]           → Player cours
/lesson/[id]           → Viewer leçon
/quiz/[id]             → Player QCM
/checkout              → Paiement
```

---

## 3. MODÈLE DE DONNÉES

### Relations Principales
```
users (Auth)
  ↓
classrooms (teacher_id)
  ↓
courses (classroom_id)
  ↓
chapters (course_id)
  ↓
lessons (chapter_id)
  ↓
qcm_questions (lesson_id)

enrollments:
├─ student_id → users
├─ classroom_id → classrooms
└─ course_id → courses

transactions:
├─ student_id → users
├─ teacher_id → users
└─ course_id → courses
```

### Tables État
| Table | État | Notes |
|-------|------|-------|
| users | ✅ Stable | Supabase Auth + profile |
| classrooms | ✅ Stable | Classes/Groupes |
| courses | ✅ Stable | Programmes avec settings JSONB |
| chapters | ✅ Stable | Modules de contenu |
| lessons | ✅ Stable | Leçons individuelles |
| enrollments | ⚠️ Incohérent | classroom_id vs course_id |
| transactions | ✅ Stable | Multi-devises |
| teacher_profiles | ⚠️ Incomplet | Migration 007 x3 |

---

## 4. FLOWS PRINCIPAUX

### 4.1 Flow Teacher: Création Contenu

```
1. /teacher/classes/create
   ├─ Step 1: Info classe (titre, matière, niveau)
   ├─ Step 2: Settings (durée, rythme, accès, features)
   ├─ Step 3: Contenu (chapitres + leçons)
   └─ Step 4: Prix & Review

2. Créations DB:
   ├─ POST /api/classes → Classroom
   ├─ POST /api/courses → Course + settings JSONB
   ├─ POST /api/chapters → Chapitres
   └─ POST /api/lessons → Leçons

3. Publication:
   └─ POST /api/courses/[id]/publish
```

### 4.2 Flow Student: Inscription & Apprentissage

```
1. DÉCOUVRIR
   /search ou /classroom/[id]

2. ACHETER
   /checkout?course=[id]
   ├─ Sélection devise (EUR, TND, XOF, etc.)
   ├─ Conversion prix automatique
   └─ POST /api/payments/[provider]/init

3. PAIEMENT
   Provider (Stripe/Konnect/etc.)
   └─ Webhook → /api/webhook/[provider]
      ├─ Crée Transaction
      ├─ Crée Enrollment (course_id!)
      └─ Notif teacher + student

4. APPRENDRE
   /learn/[classroomId]
   ├─ Affiche chapitres (via course_id)
   └─ Affiche leçons
```

### 4.3 Flow Quiz

```
1. CRÉATION (Teacher)
   /teacher/lessons/[id]/edit
   ├─ Ajoute QCM block
   └─ Configure: questions, points, passing_score

2. PRISE (Student)
   /quiz/[id]
   ├─ Affiche questions
   ├─ Timer (optionnel)
   └─ POST /api/quiz/submit

3. RÉSULTATS
   /quiz/[id]/results
   ├─ Score
   ├─ Pass/Fail
   └─ Corrections (si enabled)
```

---

## 5. DUPLICATION DE CODE

### Formulaires de Création
```
❌ /teacher/classrooms/new/page.tsx       (1282 lignes, ancien)
✅ /components/class-wizard/               (modulaire, nouveau)
```

### Payment Init
```
⚠️ Logique dupliquée dans:
├─ /lib/payment/paymentService.ts
├─ /api/payments/stripe/init/route.ts
├─ /api/payments/konnect/init/route.ts
├─ /api/payments/flouci/init/route.ts
└─ /api/payments/cinetpay/init/route.ts

Suggestion: Centraliser dans paymentService
```

### Notifications
```
⚠️ Duplication:
├─ /components/notifications-bell.tsx
├─ /components/NotificationBadge.tsx
└─ /components/notifications/notification-bell.tsx

Action: Unifier en un seul composant
```

### Assignments vs Homework
```
❓ Deux systèmes parallèles:
├─ /student/assignments/page.tsx
└─ /student/homework/page.tsx

Question: Différence? Fusionner?
```

---

## 6. INCOHÉRENCES DÉTAILLÉES

### 6.1 Prix et Devises

**Problème**: Où est la source de vérité?

```typescript
// courses table
price: number              // Toujours EUR?
currency: string           // ??? Ne correspond à rien

// transactions table
amount_eur: number         // Prix EUR
amount_local: number       // Prix converti
currency: CurrencyType     // Devise transaction
exchange_rate: number      // Taux appliqué

// users table
currency: CurrencyType     // Devise préférée
```

**Recommandation**:
```sql
-- Option A: Prix TOUJOURS en EUR
courses.price_eur NUMERIC  -- Source de vérité
-- Conversion à la lecture

-- Option B: Prix multi-devises
courses.prices JSONB       -- {EUR: 50, TND: 150, ...}
```

### 6.2 Settings JSONB vs Colonnes

**Problème**: Redondance?

```sql
courses.settings JSONB:
  ├─ duration_type: 'court|moyen|long'
  ├─ pacing_type: 'libre|guide|live'
  └─ access_mode: 'classe_privee|...'

courses.duration_minutes INTEGER     -- Vs settings.duration_type?
lessons.is_free_preview BOOLEAN      -- Vs settings.features.allow_previews?
chapters.is_published BOOLEAN        -- Vs settings.restrictions?
```

**Action**: Clarifier quelle version utiliser

### 6.3 Slides vs Presentations vs Lessons

**Problème**: Deux systèmes de contenu

```typescript
lesson:
├─ content: string           // Texte brut
├─ video_url: string         // Vidéo
├─ presentation_id: UUID     // Slides?
└─ lesson_blocks: []         // Structured content?

presentation:
└─ slides: []
   └─ slide_blocks: []

lesson_blocks:
└─ block_type: 'text|video|image|code|quiz|slides'
```

**Question**: Comment combiner?
- Lesson avec content + presentation_id?
- Ou lesson_blocks avec type='slides'?

---

## 7. CHECKLIST VALIDATION

### Architecture
- [x] Routing clair
- [x] Types TypeScript complets
- [x] Supabase clients (server/client)
- [ ] RLS policies testées
- [ ] Validations server-side
- [ ] Gestion d'erreurs uniforme

### Données
- [x] Relations FK correctes
- [ ] Unicité constraints
- [ ] Indexes performance
- [ ] Migration versioning (007!)
- [ ] Données orphelines?

### Flows
- [ ] Teacher: Settings valides?
- [x] Student: Payment ok
- [ ] Enrollment: Quelle référence?
- [x] Quiz: Fonctionnel

### Code Quality
- [x] Typing (excellent)
- [ ] Duplication (identifiée)
- [ ] Tests (aucun trouvé!)
- [ ] Documentation (éparpillée)
- [ ] Logging (partiel)

---

## 8. RECOMMANDATIONS PRIORITAIRES

### 🔴 IMMÉDIAT (1-2 jours)

**1. Dépublier ancien formulaire**
```bash
# Option A: Redirection
src/app/(dashboard)/teacher/classrooms/new/page.tsx
→ redirect('/teacher/classes/create')

# Option B: Suppression
rm src/app/(dashboard)/teacher/classrooms/new/page.tsx
```

**2. Nettoyer classroom_id vs course_id**
```sql
-- Audit enrollments
SELECT COUNT(*) FROM enrollments WHERE course_id IS NULL;

-- Migration si nécessaire
UPDATE enrollments e
SET course_id = (
  SELECT id FROM courses
  WHERE classroom_id = e.classroom_id
  LIMIT 1
)
WHERE course_id IS NULL;
```

**3. Merger migrations 007**
```bash
# Vérifier quelle est appliquée
psql> SELECT * FROM schema_migrations WHERE version LIKE '007%';

# Merger en une seule
migrations/007-complete-profile-FINAL.sql
```

**4. Tester RLS**
```sql
-- Test: Student voit prix avant achat?
SET ROLE authenticated;
SET request.jwt.claims.sub TO 'student_user_id';
SELECT id, title, price FROM courses WHERE classroom_id = '...';
```

### ⚠️ COURT TERME (1 semaine)

**5. Unifier Payment Init**
- Créer `PaymentService.initPayment(provider, params)`
- Refactor tous les `/api/payments/*/init` pour utiliser ce service

**6. Valider Settings**
```typescript
// Ajouter validation Zod
const settingsSchema = z.object({
  duration_type: z.enum(['court', 'moyen', 'long']),
  pacing_type: z.enum(['libre', 'guide', 'live']),
  access_mode: z.enum(['classe_privee', 'acces_individuel', 'mixte']),
  // ...
}).refine(data => {
  // Règles de cohérence
  if (data.pacing_type === 'live' && data.access_mode === 'acces_individuel') {
    return false // Incohérent!
  }
  return true
})
```

**7. Unifier Naming**
```
Assignment = Homework → Choisir UN terme
Teacher = Instructor → Choisir UN terme
Notification Bell = Badge → Un seul composant
```

**8. Documentation**
- [ ] Créer ER diagram (DBDiagram.io)
- [ ] Créer flow diagrams (Mermaid)
- [ ] OpenAPI/Swagger pour APIs

### 📋 MOYEN TERME (2-3 semaines)

**9. Tests**
```typescript
// Priorité:
- Business rules (pricing, enrollment)
- Payment flows (webhook handlers)
- RLS policies (access control)
```

**10. Performance**
```sql
-- Indexes suggérés:
CREATE INDEX idx_enrollments_student_course ON enrollments(student_id, course_id);
CREATE INDEX idx_chapters_course ON chapters(course_id);
CREATE INDEX idx_lessons_chapter ON lessons(chapter_id);
```

**11. Monitoring**
- Sentry pour erreurs
- CloudWatch pour logs
- Alertes: Payment success rate, RLS denials

---

## 9. SCORES DÉTAILLÉS

| Aspect | Score | Priorité | Notes |
|--------|-------|----------|-------|
| Architecture | 7/10 | HIGH | Solide mais systèmes parallèles |
| Modèle Données | 6/10 | HIGH | Incohérences classroom_id/course_id |
| Flow Teacher | 7/10 | HIGH | Bon wizard mais ancien existe encore |
| Flow Student | 8/10 | OK | Fixé récemment |
| Flow Payment | 9/10 | OK | Multi-provider fonctionne bien |
| Flow Quiz | 8/10 | OK | Structure correcte |
| RLS Policies | 7/10 | HIGH | Récemment corrigé, à tester |
| Settings | 8/10 | OK | JSONB bien structuré |
| Types | 9/10 | OK | Excellent typing |
| Code Quality | 6/10 | MEDIUM | Duplication identifiée |
| Tests | 2/10 | LOW | Quasi inexistants |
| Documentation | 5/10 | LOW | Éparpillée mais présente |

**Score Global**: **7.0/10** - Bon mais fragile

---

## 10. FICHIERS CLÉS À CORRIGER

### 🔴 Priorité 1
```
src/app/(dashboard)/teacher/classrooms/new/page.tsx
  → Désactiver ou supprimer

migrations/007-complete-profile*.sql (x3)
  → Merger en un seul

src/app/api/enrollments/route.ts
  → Clarifier classroom_id vs course_id
```

### ⚠️ Priorité 2
```
src/app/(dashboard)/course/[id]/page.tsx
  → Vérifier enrollment queries

src/components/notifications-bell.tsx
src/components/NotificationBadge.tsx
  → Unifier

src/lib/payment/*.ts
  → Centraliser logique init
```

### ✅ Bon État
```
src/types/                     (Types complets)
src/lib/supabase/             (Clients corrects)
src/components/class-wizard/  (Bon workflow)
src/app/api/courses/          (Mostly OK)
```

---

## 11. CONCLUSION

**État**: ⚠️ Plateforme **FONCTIONNELLE** mais **FRAGILE**

**Ce qui marche**:
- ✅ Stack technique moderne et performante
- ✅ Types TypeScript complets et cohérents
- ✅ Système de paiement multi-provider opérationnel
- ✅ Programme Unifié avec settings JSONB
- ✅ RLS policies corrigées (2026-01-28)

**Ce qui pose problème**:
- ❌ Deux systèmes de création cours parallèles
- ❌ Confusion persistante classroom_id vs course_id
- ❌ Migrations 007 dupliquées (versioning Git)
- ❌ Code dupliqué (paiements, formulaires, notifs)
- ❌ Tests absents

**Risques principaux**:
1. 🔴 Données orphelines (enrollments avec classroom_id)
2. 🔴 RLS bypass si nouvelles policies mal appliquées
3. ⚠️ Pricing incohérent (EUR vs local)
4. ⚠️ User confusion (deux formulaires)

**Recommandation**: Suivre le plan de **Recommandations Prioritaires** (Section 8)

**Prochaine session**: Commencer par P1 (dépublier ancien formulaire) et P2 (nettoyer classroom_id).

---

**Audit réalisé**: 28 janvier 2026
**Agent**: Claude Sonnet 4.5
**Format**: Read-only analysis + Actionable recommendations
