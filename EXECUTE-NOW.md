# 🚨 EXÉCUTER MAINTENANT - ORDRE PRÉCIS

**Date**: 2026-01-24
**Temps estimé**: 10 minutes
**Priorité**: CRITIQUE

---

## ✅ ÉTAPE 1 : Exécuter le fix SQL (2 minutes)

### Dans Supabase SQL Editor :

1. **Ouvrir** : https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. **Copier-coller** le contenu de `FIX-RLS-POLICIES-FINAL.sql`
3. **Cliquer** sur "Run" ou "Exécuter"
4. **Vérifier** : Vous devez voir des messages de succès

### Résultat attendu :
```
🔧 Policy restrictive supprimée
✅ Nouvelle policy créée
✅ Toutes les classes sont publiques
```

---

## ✅ ÉTAPE 2 : Vérifier que la migration 006 est exécutée (1 minute)

### Dans Supabase SQL Editor :

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'enrollments'
AND column_name = 'course_id';
```

### Si le résultat est VIDE :
**Exécuter** le fichier `migrations/006-course-level-enrollment.sql`

### Si le résultat contient 'course_id' :
✅ Migration déjà exécutée, passer à l'étape suivante

---

## ✅ ÉTAPE 3 : Redémarrer le serveur (1 minute)

### Dans votre terminal :

```bash
# 1. Arrêter le serveur
Ctrl+C

# 2. Relancer
npm run dev
# ou
pnpm dev

# 3. Attendre le message "Ready" ou "Compiled"
```

**IMPORTANT** : Ne pas sauter cette étape ! Les corrections de l'API ne sont pas appliquées sans redémarrage.

---

## ✅ ÉTAPE 4 : Vider le cache navigateur (30 secondes)

### Option 1 : DevTools
1. Ouvrir DevTools (F12)
2. Onglet "Network"
3. Cocher "Disable cache"
4. Faire **Ctrl+Shift+R** (ou Cmd+Shift+R sur Mac)

### Option 2 : Effacement complet
- Chrome/Edge : **Ctrl+Shift+Delete** → Vider le cache
- Firefox : **Ctrl+Shift+Delete** → Vider le cache

---

## ✅ ÉTAPE 5 : Tester l'affichage des prix (3 minutes)

### Test de base :

1. **Ouvrir** : `http://localhost:3000`
2. **Se connecter** (si pas déjà connecté)
3. **Aller** sur une page classroom : `/classroom/[un-id-de-classe]`
4. **Ouvrir** la console DevTools (F12) → onglet **Console**

### ✅ SUCCÈS si vous voyez :
- Prix affichés : "20€", "25€", etc. (pas "0€")
- Bouton "💳 Acheter ce cours - 20€" visible
- Pas d'erreur dans la console

### ❌ ÉCHEC si vous voyez :
- Prix = "0€" partout
- Pas de bouton "Acheter"
- Erreurs 403 ou 500 dans la console

---

## ✅ ÉTAPE 6 : Tester le flow de paiement (5 minutes)

**Seulement si l'étape 5 a réussi**

1. **Cliquer** sur "Acheter ce cours"
2. **Vérifier** : Redirection vers `/checkout?course=ID`
3. **Vérifier** : Prix affiché correctement
4. **Cliquer** sur "Confirmer l'inscription"
5. **Vérifier** : Redirection vers Stripe (page bleue/blanche Stripe)
6. **Entrer carte test** : `4242 4242 4242 4242`
   - Date : N'importe quelle date future
   - CVV : `123`
7. **Vérifier** : Redirection vers `/payment/success`
8. **Vérifier** : Cours accessible dans "Mes cours"

---

## 🆘 SI ÇA NE FONCTIONNE PAS

### Cas 1 : Prix toujours = 0€ après ÉTAPE 5

**Cause probable** : Requête Supabase ne récupère pas le champ `price`

**Solution** :
```sql
-- Dans Supabase SQL Editor
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'courses'
AND cmd = 'SELECT';
```

Si vous voyez une policy avec `enrollments` dans `qual`, c'est le problème.

**Réexécuter** `FIX-RLS-POLICIES-FINAL.sql`

---

### Cas 2 : Erreur 500 sur création de cours

**Cause** : Serveur pas redémarré ou fix API non appliqué

**Solution** :
1. Arrêter le serveur (Ctrl+C)
2. Vérifier que `src/app/api/courses/route.ts` contient le code du fix
3. Relancer `npm run dev`
4. Attendre le message "Compiled"

---

### Cas 3 : Bouton "Acheter" n'apparaît pas

**Vérifier** :
- Vous n'êtes PAS le propriétaire du cours (teacher)
- Vous n'êtes PAS déjà inscrit
- Le cours est bien "premium" (pas "free")
- Le prix est > 0

**Debug** : Ajouter dans `src/app/(dashboard)/classroom/[id]/page.tsx` (ligne 316) :
```tsx
console.log('🔍 Course debug:', {
  id: course.id,
  title: course.title,
  price: course.price,
  access_type: course.access_type,
  isEnrolled: enrolledCourseIds.has(course.id),
  isOwner: currentUserId === classroom.teacher_id,
  isFree: course.access_type === 'free' || course.price === 0
})
```

---

### Cas 4 : Stripe ne redirige pas

**Vérifier** :
1. Les clés Stripe dans `.env.local` :
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
2. Les logs dans le terminal serveur (erreurs API)
3. La console navigateur (erreurs fetch)

---

## 📋 CHECKLIST FINALE

Cochez après chaque étape :

- [ ] SQL fix exécuté dans Supabase
- [ ] Migration 006 vérifiée (ou exécutée)
- [ ] Serveur redémarré
- [ ] Cache navigateur vidé
- [ ] Page classroom affiche les prix corrects (pas 0€)
- [ ] Bouton "Acheter" visible pour cours payants
- [ ] Clic sur "Acheter" → redirect vers `/checkout?course=ID`
- [ ] Page checkout affiche le bon prix
- [ ] Clic sur "Confirmer" → redirect vers Stripe
- [ ] Paiement test fonctionne (carte 4242...)
- [ ] Redirect vers `/payment/success` après paiement
- [ ] Cours accessible dans "Mes cours"

---

## ✅ SI TOUT FONCTIONNE

**Félicitations !** Le système fonctionne correctement.

Vous pouvez maintenant :
1. Retirer les `console.log` de debug (si ajoutés)
2. Tester avec d'autres cours
3. Tester en tant qu'étudiant et professeur
4. Vérifier les devises multiples (TND, EUR, XOF, etc.)

---

## 📞 AIDE SUPPLÉMENTAIRE

Si tout échoue après ces 6 étapes, partagez :
1. Le résultat de l'ÉTAPE 5 (screenshots + logs console)
2. Les erreurs dans le terminal serveur
3. Le résultat de cette requête SQL :
   ```sql
   SELECT id, title, price, access_type FROM courses LIMIT 5;
   ```

---

*Suivez ces étapes dans l'ordre exact. Ne sautez AUCUNE étape.*
