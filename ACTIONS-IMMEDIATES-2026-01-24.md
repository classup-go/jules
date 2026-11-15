# ⚡ ACTIONS IMMÉDIATES - CORRECTION DU SYSTÈME

**Date** : 2026-01-24
**Urgence** : CRITIQUE
**Temps estimé** : 1-2 heures

---

## 🎯 OBJECTIF

Rétablir un système fonctionnel où :
1. Les prix s'affichent correctement
2. Les étudiants peuvent acheter des cours
3. Le flow de paiement fonctionne de bout en bout

---

## ✅ ACTIONS DANS L'ORDRE

### ACTION 1 : Diagnostic (5 minutes)

**Dans Supabase SQL Editor**, exécutez :

```sql
\i DIAGNOSTIC-RAPIDE.sql
```

Ou copiez-collez le contenu de [DIAGNOSTIC-RAPIDE.sql](DIAGNOSTIC-RAPIDE.sql)

**Résultats attendus** :
- `course_id_exists_in_enrollments` = true/false
- `prix_positif` > 0 (au moins quelques cours ont un prix)
- Liste des cours avec leurs vrais prix

**Si course_id_exists = false** → Passer directement à ACTION 2
**Si prix_positif = 0** → Tous les prix sont à zéro (BUG MAJEUR)

---

### ACTION 2 : Exécuter la migration (2 minutes)

**Dans Supabase SQL Editor** :

```sql
\i migrations/006-course-level-enrollment.sql
```

Ou ouvrir le fichier [migrations/006-course-level-enrollment.sql](migrations/006-course-level-enrollment.sql) et exécuter son contenu.

**Vérification** :

```sql
-- Devrait retourner 'course_id'
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'enrollments'
AND column_name = 'course_id';
```

---

### ACTION 3 : Redémarrer le serveur (1 minute)

**Dans le terminal où tourne votre serveur** :

1. **Arrêter** : `Ctrl+C`
2. **Relancer** :
   ```bash
   npm run dev
   # ou
   pnpm dev
   ```

3. **Attendre** que le serveur soit prêt (message "Ready" ou "Compiled")

---

### ACTION 4 : Vider le cache navigateur (30 secondes)

**Dans votre navigateur** :

1. Ouvrir **DevTools** (F12)
2. Aller dans l'onglet **Network**
3. Cocher **"Disable cache"**
4. Faire **Ctrl+Shift+R** (ou Cmd+Shift+R sur Mac)

Ou :
- Chrome/Edge : **Ctrl+Shift+Delete** → Vider le cache
- Firefox : **Ctrl+Shift+Delete** → Vider le cache

---

### ACTION 5 : Ajouter des logs de debug (5 minutes)

**Fichier** : [src/app/(dashboard)/classroom/[id]/page.tsx](src/app/(dashboard)/classroom/[id]/page.tsx)

**Trouver la ligne 135** (après le chargement des cours) et ajouter :

```tsx
if (coursesData && coursesData.length > 0) {
  console.log('=== COURSES LOADED ===')
  console.log('Total courses:', coursesData.length)
  coursesData.forEach((c, i) => {
    console.log(`Course ${i + 1}:`, {
      id: c.id,
      title: c.title,
      price: c.price,
      access_type: c.access_type,
      typeof_price: typeof c.price
    })
  })
  console.log('=== END COURSES ===')
  // ... suite du code existant
}
```

**Trouver la ligne 314** (dans le map des cours) et ajouter avant le return :

```tsx
{courses.map((course, index) => {
  const isEnrolled = enrolledCourseIds.has(course.id)
  const isFree = course.access_type === 'free' || course.price === 0
  const priceInUserCurrency = paymentConfig ? convertPrice(course.price, paymentConfig) : course.price
  const formattedPrice = paymentConfig ? formatPrice(priceInUserCurrency, paymentConfig) : `${course.price}€`

  // 🔍 DEBUG: Ajouter ceci
  console.log(`Rendering course ${index + 1}:`, {
    title: course.title,
    price: course.price,
    isFree,
    priceInUserCurrency,
    formattedPrice,
    paymentConfig: paymentConfig ? paymentConfig.currency : 'null'
  })

  return (
    // ... reste du code
  )
})}
```

**Sauvegarder le fichier**

---

### ACTION 6 : Tester l'affichage (3 minutes)

1. **Ouvrir** votre application : `http://localhost:3000`
2. **Se connecter** (si pas déjà connecté)
3. **Aller** sur une page classroom : `/classroom/[un-id-de-classe]`
4. **Ouvrir** la console DevTools (F12) → onglet **Console**

**Observer les logs** :

```
=== COURSES LOADED ===
Total courses: 3
Course 1: { id: 'xxx', title: 'chimie 1', price: 20, access_type: 'premium', typeof_price: 'number' }
Course 2: { id: 'yyy', title: 'abb 20', price: 20, access_type: 'premium', typeof_price: 'number' }
...
Rendering course 1: { title: 'chimie 1', price: 20, isFree: false, priceInUserCurrency: 20, formattedPrice: '20€' }
```

**Scénarios possibles** :

#### ✅ CAS 1 : Prix corrects dans les logs

```
price: 20
formattedPrice: '20€'
```

→ Le système fonctionne ! Les prix s'affichent.
→ Passer à **ACTION 7** (test paiement)

#### ❌ CAS 2 : Prix undefined ou null

```
price: undefined
formattedPrice: '0€'
```

→ La requête Supabase ne récupère pas le prix
→ **SOLUTION** : Voir ACTION 6.1

#### ❌ CAS 3 : Prix en base mais formattedPrice = '0€'

```
price: 20
formattedPrice: '0€'
```

→ Problème de conversion/formatage
→ **SOLUTION** : Voir ACTION 6.2

---

### ACTION 6.1 : Fix requête Supabase (si prix undefined)

**Problème** : Les RLS policies bloquent la lecture du champ `price`

**Solution** : Vérifier les policies

```sql
-- Dans Supabase SQL Editor
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'courses';
```

**Si aucune policy SELECT** ou **qual** bloque l'accès :

```sql
-- Créer/Modifier la policy SELECT
DROP POLICY IF EXISTS "Anyone can view published courses" ON courses;

CREATE POLICY "Anyone can view courses"
ON courses
FOR SELECT
USING (true);  -- Autoriser tout le monde à voir les cours
```

**Relancer le test**

---

### ACTION 6.2 : Fix conversion prix (si formattedPrice = '0€')

**Fichier** : [src/app/(dashboard)/classroom/[id]/page.tsx](src/app/(dashboard)/classroom/[id]/page.tsx)

**Ligne 316-318**, remplacer par :

```tsx
const isFree = course.access_type === 'free' || !course.price || course.price === 0
const priceInUserCurrency = (paymentConfig && course.price > 0)
  ? convertPrice(course.price, paymentConfig)
  : (course.price || 0)
const formattedPrice = (paymentConfig && priceInUserCurrency > 0)
  ? formatPrice(priceInUserCurrency, paymentConfig)
  : `${course.price || 0}€`

console.log('💰 Price calculation:', {
  originalPrice: course.price,
  paymentConfig: paymentConfig?.currency,
  priceInUserCurrency,
  formattedPrice
})
```

---

### ACTION 7 : Tester le flow de paiement (10 minutes)

1. **Sur la page classroom**, cliquer sur **"Acheter ce cours"**
2. **Vérifier** : Redirection vers `/checkout?course=ID`
3. **Vérifier** : Page affiche le prix correct
4. **Cliquer** sur **"Confirmer l'inscription"**
5. **Vérifier** : Redirection vers Stripe (page bleue/blanche)
6. **Entrer carte test** : `4242 4242 4242 4242`, date future, CVV 123
7. **Vérifier** : Redirection vers `/payment/success`
8. **Vérifier** : Cours accessible dans "Mes cours"

**Si ça échoue à l'étape X**, noter l'étape et l'erreur → Voir TROUBLESHOOTING

---

### ACTION 8 : Retirer les logs de debug (2 minutes)

**Une fois que tout fonctionne**, retirer les `console.log` ajoutés en ACTION 5.

---

## 🆘 TROUBLESHOOTING

### Problème : "Bouton Acheter n'apparaît pas"

**Causes possibles** :
1. Vous êtes le propriétaire du cours (prof)
2. Vous êtes déjà inscrit
3. Le cours est gratuit
4. `isFree` est mal calculé

**Solution** :
```tsx
// Ajouter avant le bouton
console.log('🔍 Button visibility:', {
  isEnrolled,
  isOwner: currentUserId === classroom.teacher_id,
  currentUserId,
  teacherId: classroom.teacher_id,
  isFree,
  shouldShowBuyButton: !isEnrolled && currentUserId !== classroom.teacher_id && currentUserId && !isFree
})
```

---

### Problème : "Erreur 404 sur /api/checkout"

**Cause** : L'API n'existe pas ou route mal définie

**Solution** :
```bash
# Vérifier que le fichier existe
ls src/app/api/checkout/route.ts
```

Si absent, le créer ou vérifier le code.

---

### Problème : "Stripe ne redirige pas"

**Cause** : `session.url` est null ou erreur Stripe

**Solution** :
1. Vérifier les clés Stripe dans `.env.local`
2. Vérifier les logs serveur (terminal)
3. Vérifier la console navigateur (erreurs fetch)

---

### Problème : "Webhook ne crée pas l'enrollment"

**Cause** : Webhook non configuré ou signature invalide

**Solution** :
1. Vérifier `STRIPE_WEBHOOK_SECRET` dans `.env.local`
2. Tester avec Stripe CLI :
   ```bash
   stripe listen --forward-to localhost:3000/api/webhook/stripe
   stripe trigger payment_intent.succeeded
   ```

---

## 📊 CHECKLIST FINALE

Une fois TOUTES les actions effectuées :

- [ ] Migration 006 exécutée
- [ ] Serveur redémarré
- [ ] Cache navigateur vidé
- [ ] Logs de debug ajoutés
- [ ] Prix affichés correctement dans la console
- [ ] Prix affichés correctement sur la page
- [ ] Bouton "Acheter" visible pour les cours payants
- [ ] Clic sur "Acheter" → redirect vers checkout
- [ ] Checkout affiche le bon prix
- [ ] Clic sur "Confirmer" → redirect vers Stripe
- [ ] Paiement test fonctionne
- [ ] Webhook crée l'enrollment
- [ ] Étudiant peut accéder au cours acheté
- [ ] Logs de debug retirés

---

## 📞 SI TOUT ÉCHOUE

**Dernier recours** : Créer un cours test manuellement

```sql
-- Dans Supabase SQL Editor
INSERT INTO courses (
  classroom_id,
  title,
  description,
  price,
  access_type,
  teacher_id,
  subject,
  level,
  settings
) VALUES (
  'UN_CLASSROOM_ID_EXISTANT',
  'Cours test avec prix',
  'Description test',
  25,  -- 25 EUR
  'premium',
  'VOTRE_USER_ID',
  'Test',
  'Test',
  '{"access_mode": "acces_individuel", "duration_type": "moyen", "pacing_type": "libre"}'::jsonb
) RETURNING id, title, price;
```

Puis tester l'affichage de CE cours spécifiquement.

---

## 🎯 RÉSULTAT ATTENDU

À la fin, vous devez avoir :

1. **Page classroom** qui affiche les cours avec leurs vrais prix
2. **Bouton "Acheter"** visible et cliquable
3. **Flow Stripe** qui fonctionne de bout en bout
4. **Enrollment** créé après paiement vérifié
5. **Accès au cours** donné à l'étudiant

---

*Suivez ces étapes dans l'ordre. Ne sautez aucune étape.*
