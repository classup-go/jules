# IMPLÉMENTATION : PAIEMENT PAR COURS

**Date**: 2026-01-24
**Statut**: En cours
**Objectif**: Permettre l'achat et le paiement de chaque cours individuellement

---

## ✅ TERMINÉ

### 1. Migration Base de Données ✅
- [migrations/006-course-level-enrollment.sql](migrations/006-course-level-enrollment.sql)
- Ajout de `course_id` dans `enrollments`
- Ajout de `enrolled_count` dans `courses`
- Triggers pour maintenir les compteurs à jour
- Migration des enrollments existants

### 2. Page Paramètres ✅
- [src/app/(dashboard)/settings/page.tsx](src/app/(dashboard)/settings/page.tsx)
- Sélection pays/devise par l'utilisateur
- Sauvegarde dans `users.country` et `users.currency`
- Interface professionnelle avec recherche et regroupement par région
- Affichage des méthodes de paiement disponibles

### 3. Formulaire Création de Cours ✅
- [src/components/class-wizard/steps/Step3FirstCourse.tsx](src/components/class-wizard/steps/Step3FirstCourse.tsx)
- Lecture de la devise depuis le profil utilisateur
- Affichage dynamique du symbole de devise
- Conversion et affichage du prix en EUR
- Lien vers les paramètres pour changer la devise

### 4. Logic de Conversion EUR ✅
- [src/components/class-wizard/ClassWizard.tsx](src/components/class-wizard/ClassWizard.tsx)
- Conversion automatique du prix vers EUR avant sauvegarde
- Prix stockés en EUR dans la base (devise de base)
- Arrondi à 2 décimales

---

## 🚧 EN COURS

### 5. Page Classroom - Affichage par Cours
**Fichier**: [src/app/(dashboard)/classroom/[id]/page.tsx](src/app/(dashboard)/classroom/[id]/page.tsx)

**Modifications nécessaires**:

1. **Charger les cours avec leurs prix** :
```tsx
// Remplacer la requête actuelle
const { data: courses } = await supabase
  .from('courses')
  .select(`
    id,
    title,
    description,
    price,
    access_type,
    enrolled_count,
    learning_objectives,
    prerequisites,
    chapters (
      id,
      title,
      order_index
    )
  `)
  .eq('classroom_id', id)
  .order('created_at', { ascending: true })
```

2. **Vérifier enrollment par cours** :
```tsx
// Pour chaque cours, vérifier si l'utilisateur est inscrit
const enrolledCourseIds = new Set()
if (user) {
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', user.id)
    .eq('classroom_id', id)
    .not('course_id', 'is', null)

  enrollments?.forEach(e => enrolledCourseIds.add(e.course_id))
}
```

3. **Afficher chaque cours séparément** :
```tsx
{courses.map(course => {
  const isEnrolled = enrolledCourseIds.has(course.id)
  const priceInUserCurrency = convertPrice(course.price, paymentConfig)

  return (
    <div key={course.id} className="course-card">
      <h3>{course.title}</h3>
      <p>{course.description}</p>
      <div className="price">
        {course.access_type === 'free' ? 'Gratuit' : formatPrice(priceInUserCurrency, paymentConfig)}
      </div>
      {isEnrolled ? (
        <Link href={`/course/${course.id}`}>Accéder au cours</Link>
      ) : (
        <Link href={`/checkout?course=${course.id}`}>Acheter ce cours</Link>
      )}
    </div>
  )
})}
```

---

## 📋 À FAIRE

### 6. Checkout pour Cours Spécifique
**Fichier**: [src/app/(dashboard)/checkout/page.tsx](src/app/(dashboard)/checkout/page.tsx)

**Modifications**:
1. Accepter `?course=ID` au lieu de `?classroom=ID`
2. Charger le cours depuis la table `courses`
3. Afficher le prix du cours spécifique
4. Appeler `/api/checkout` avec `course_id`

### 7. API Checkout (Stripe)
**Fichier**: [src/app/api/checkout/route.ts](src/app/api/checkout/route.ts)

**Modifications**:
1. Accepter `courseId` au lieu de `classroomId`
2. Charger le cours et vérifier les permissions
3. Créer Stripe Checkout Session avec le prix du cours
4. Inclure `course_id` dans les metadata

### 8. API Enrollment
**Fichier**: [src/app/api/enrollment/create/route.ts](src/app/api/enrollment/create/route.ts)

**Modifications**:
1. Cette route ne devrait être appelée QUE par le webhook Stripe
2. Accepter `course_id` dans les metadata
3. Créer enrollment avec `course_id` renseigné
4. Incrémenter `courses.enrolled_count`

### 9. Webhook Stripe
**Fichier**: [src/app/api/webhook/stripe/route.ts](src/app/api/webhook/stripe/route.ts)

**Vérifier**:
1. Récupération du `course_id` depuis metadata
2. Appel à l'API enrollment avec le bon `course_id`
3. Gestion des erreurs

---

## 📐 ARCHITECTURE

### Flow de Paiement (Nouveau)

```
1. Étudiant va sur /classroom/{id}
   ↓
2. Voit liste des cours avec prix individuels
   ↓
3. Clique "Acheter ce cours" → /checkout?course={course_id}
   ↓
4. Page checkout charge le COURS spécifique
   ├─ Si gratuit → Enrollment direct
   └─ Si payant → Appel /api/checkout
        ↓
5. API /api/checkout
   ├─ Vérifie que le cours existe
   ├─ Vérifie que l'utilisateur n'est pas déjà inscrit
   ├─ Crée Stripe Checkout Session
   ├─ Metadata: { course_id, student_id, teacher_id, amount_eur }
   └─ Return session.url
        ↓
6. Redirect vers Stripe Hosted Checkout
   ↓
7. Utilisateur entre sa carte
   ↓
8. Stripe webhook → /api/webhook/stripe
   ├─ Vérifie la signature
   ├─ Extract metadata.course_id
   ├─ Crée transaction (status: 'completed')
   ├─ Crée enrollment (avec course_id)
   └─ Incrémente courses.enrolled_count
        ↓
9. Redirect vers /payment/success?course_id={id}
   ↓
10. Utilisateur peut accéder au cours
```

### Données Stockées

**users** :
- `country`: Code pays (FR, TN, SN, etc.)
- `currency`: Devise préférée (EUR, TND, XOF, etc.)

**courses** :
- `price`: Prix en EUR (devise de base)
- `enrolled_count`: Nombre d'inscriptions à CE cours

**enrollments** :
- `course_id`: ID du cours spécifique acheté
- `classroom_id`: Maintenu pour organisation
- `student_id`: ID de l'étudiant
- `payment_id`: Lien vers transaction

**transactions** :
- `course_id`: ID du cours acheté
- `amount_eur`: Prix en EUR
- `amount_local`: Prix en devise locale
- `currency`: Devise utilisée
- `exchange_rate`: Taux de change appliqué

---

## 🔧 COMMANDES

### Exécuter la migration
```sql
-- Dans Supabase SQL Editor
\i migrations/006-course-level-enrollment.sql
```

### Tester la conversion de devise
```typescript
import { getPaymentConfig, convertPrice, formatPrice } from '@/lib/payment/config'

const config = getPaymentConfig('TN') // Tunisie
console.log(config.currency) // TND
console.log(config.exchangeRate) // 3.35

const priceEUR = 30
const priceTND = convertPrice(priceEUR, config) // 100.5
const formatted = formatPrice(priceTND, config) // "100.50 DT"
```

---

## ⚠️ POINTS D'ATTENTION

1. **Toujours stocker en EUR** : Les prix en base sont TOUJOURS en EUR
2. **Conversion à l'affichage** : La conversion se fait côté client selon les préférences utilisateur
3. **Webhook = Source de vérité** : Seul le webhook Stripe peut marquer une transaction "completed"
4. **course_id obligatoire** : Tous les nouveaux enrollments doivent avoir un course_id
5. **Backward compatibility** : Les anciens enrollments (sans course_id) continuent de fonctionner

---

## 📊 MÉTRIQUES DE SUCCÈS

- ✅ Professeur peut définir un prix en sa devise locale
- ✅ Prix converti et stocké en EUR
- ✅ Étudiant voit le prix dans sa devise locale
- ✅ Achat d'un cours unique sans être forcé d'acheter toute la classe
- ✅ Paiement Stripe fonctionnel avec webhook
- ✅ Enrollment créé uniquement après paiement vérifié
- ✅ Statistiques par cours (enrolled_count)

---

## 📝 NOTES

- La devise par défaut pour les nouveaux utilisateurs est EUR (France)
- Les taux de change TND et USD devraient être mis à jour régulièrement
- Les taux FCFA (XOF, XAF) sont fixes (655.96) - parité fixe avec l'EUR
