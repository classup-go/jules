# Fix: Erreur 406 "Transaction introuvable"

**Date**: 2026-01-22
**Status**: ✅ Corrigé

---

## 🐛 Problème

Après simplification du checkout, erreurs 406 dans la console:

```
Failed to load resource: status 406
/rest/v1/transactions?select=*&payment_type=eq.course_enrollment&metadata=cs.{"classroom_id":"..."}
```

Message: **"Transaction introuvable"**

---

## 🔍 Cause Racine

### Problème 1: Table `payments` inexistante

Dans le checkout simplifié, nous créions un record dans une table `payments` qui **n'existe pas** :

```typescript
// ❌ FAUX - Table payments n'existe pas
await supabase.from('payments').insert({
  classroom_id: classroomId,
  student_id: userId,
  teacher_id: classroom.teacher_id,
  amount: classroom.price,
  amount_local: localPrice,
  currency: paymentConfig.currency,
  status: 'completed',
  payment_method: selectedMethod.id,
})
```

### Problème 2: Structure du système

Le système utilise la table **`transactions`** pour TOUS les paiements:
- Course enrollments
- Bookings 1-to-1
- Subscriptions

Voir: `supabase-payment-system-setup.sql` ligne 10-44

---

## ✅ Solution

### 1. Utiliser la Table `transactions`

Modifier le checkout pour créer un record dans la table correcte:

```typescript
// ✅ BON - Utiliser transactions
const { data: transaction } = await supabase
  .from('transactions')
  .insert({
    payment_type: 'course_enrollment',
    student_id: userId,
    teacher_id: classroom.teacher_id,
    amount_eur: classroom.price,
    amount_local: localPrice,
    currency: paymentConfig.currency,
    exchange_rate: paymentConfig.exchangeRate,
    payment_provider: selectedMethod.id.includes('stripe') ? 'stripe' : selectedMethod.id,
    status: 'completed',
    completed_at: new Date().toISOString(),
    metadata: {
      classroom_id: classroomId,
      classroom_title: classroom.title,
      payment_method: selectedMethod.id
    }
  })
  .select()
  .single()
```

### 2. Lier l'Enrollment à la Transaction

```typescript
// Créer enrollment avec référence transaction
const { error: enrollError } = await supabase
  .from('enrollments')
  .insert({
    classroom_id: classroomId,
    student_id: userId,
    payment_id: transaction.id,           // ✅ Lien vers transaction
    payment_required: true,               // ✅ Paiement requis
    payment_completed_at: new Date().toISOString()  // ✅ Date paiement
  })
```

---

## 📊 Structure Table `transactions`

### Colonnes Principales

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Identifiant unique |
| `payment_type` | TEXT | 'course_enrollment', 'booking', 'subscription' |
| `student_id` | UUID | Référence users(id) |
| `teacher_id` | UUID | Référence users(id) (NULL pour subscriptions) |
| `amount_eur` | DECIMAL | Montant en EUR (devise de base) |
| `amount_local` | DECIMAL | Montant en devise locale |
| `currency` | TEXT | 'EUR', 'TND', 'USD', 'XOF', 'XAF' |
| `exchange_rate` | DECIMAL | Taux de conversion depuis EUR |
| `payment_provider` | TEXT | 'stripe', 'konnect', 'flouci', 'cinetpay' |
| `status` | TEXT | 'pending', 'processing', 'completed', 'failed', etc. |
| `metadata` | JSONB | Données flexibles (classroom_id, etc.) |
| `completed_at` | TIMESTAMPTZ | Date de complétion |

### Indexes

```sql
CREATE INDEX idx_transactions_metadata ON transactions USING gin(metadata);
CREATE INDEX idx_transactions_student ON transactions(student_id);
CREATE INDEX idx_transactions_teacher ON transactions(teacher_id);
CREATE INDEX idx_transactions_type ON transactions(payment_type);
CREATE INDEX idx_transactions_status ON transactions(status);
```

---

## 📊 Structure Table `enrollments`

### Colonnes Paiement

| Colonne | Type | Description |
|---------|------|-------------|
| `payment_id` | UUID | Référence transactions(id) |
| `payment_required` | BOOLEAN | Paiement nécessaire ? |
| `payment_completed_at` | TIMESTAMPTZ | Date paiement |

Voir: `supabase-payment-system-setup.sql` ligne 237-253

---

## 🔄 Flux Corrigé

### Avant (❌ Incorrect)
```
1. Clic "Confirmer l'inscription"
2. Créer enrollment
3. Créer record dans payments (table inexistante) ❌
4. Mettre à jour enrolled_count
5. Redirection vers /payment/success
6. Page success cherche transaction → 406 Error ❌
```

### Après (✅ Correct)
```
1. Clic "Confirmer l'inscription"
2. Créer transaction dans transactions ✅
3. Créer enrollment avec payment_id ✅
4. Mettre à jour enrolled_count
5. Redirection vers /payment/success
6. Page success trouve transaction via metadata.classroom_id ✅
```

---

## 🧪 Tests

### Test 1: Vérifier Transaction Créée

1. S'inscrire à un cours payant
2. Ouvrir Supabase → Tables → transactions
3. Vérifier nouveau record:
   - `payment_type = 'course_enrollment'`
   - `status = 'completed'`
   - `metadata` contient `classroom_id`
   - `amount_eur` et `amount_local` corrects

### Test 2: Vérifier Enrollment Lié

1. Après inscription
2. Ouvrir Supabase → Tables → enrollments
3. Vérifier nouveau record:
   - `payment_id` = UUID de la transaction
   - `payment_required = true`
   - `payment_completed_at` rempli

### Test 3: Page Success

1. Après inscription
2. Vérifier redirection vers `/payment/success?classroom_id=...`
3. **Plus d'erreur 406** dans la console ✅
4. Page affiche:
   - "Paiement réussi !"
   - Détails du cours
   - Bouton "Commencer le cours"

### Test 4: Console Browser

1. Ouvrir DevTools → Console
2. S'inscrire à un cours
3. Vérifier: **Aucune erreur 406** ✅
4. Vérifier requête réussie:
   ```
   GET /rest/v1/transactions?select=*&payment_type=eq.course_enrollment...
   Status: 200 OK ✅
   ```

---

## 🔍 Débogage

### Si Erreur Persiste

#### Vérifier Table `transactions` Existe

```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name = 'transactions';
-- Doit retourner 1
```

#### Vérifier Colonnes

```sql
\d transactions
-- Doit montrer: payment_type, metadata, amount_eur, etc.
```

#### Vérifier RLS Policies

```sql
SELECT * FROM pg_policies
WHERE tablename = 'transactions';
-- Doit avoir policy "Users view own transactions"
```

#### Test Requête Manuelle

```sql
SELECT * FROM transactions
WHERE payment_type = 'course_enrollment'
  AND student_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 1;
```

---

## 📝 Fichiers Modifiés

### 1. `src/app/(dashboard)/checkout/page.tsx`

**Fonction `handlePayment`** (lignes ~169-217):
- ✅ Créer transaction dans `transactions`
- ✅ Inclure tous les champs requis
- ✅ Lier enrollment via `payment_id`
- ✅ Gérer erreurs avec logs

### 2. Migration SQL

**Aucune migration requise** - Table `transactions` déjà créée via:
- `supabase-payment-system-setup.sql`

---

## 🎯 Points Clés

### 1. Table Universelle

`transactions` est la **seule** table pour tous les paiements:
- ✅ Course enrollments
- ✅ Bookings 1-to-1
- ✅ Subscriptions

### 2. Metadata JSONB

Le champ `metadata` est flexible:
```typescript
metadata: {
  classroom_id: '...',           // Pour course_enrollment
  classroom_title: '...',        // Info utile
  payment_method: 'stripe_card'  // Méthode choisie
}
```

### 3. Exchange Rate

Toujours stocker:
- `amount_eur`: Prix en EUR (devise de base)
- `amount_local`: Prix en devise locale
- `exchange_rate`: Taux utilisé (ex: 3.35 pour TND)

### 4. Payment Provider

Mapper correctement:
```typescript
payment_provider: selectedMethod.id.includes('stripe')
  ? 'stripe'
  : selectedMethod.id  // 'konnect', 'flouci', etc.
```

---

## ✅ Résultat Final

- ✅ **Plus d'erreur 406** sur transactions
- ✅ **Transactions créées** correctement dans DB
- ✅ **Enrollments liés** via payment_id
- ✅ **Page success** affiche transaction
- ✅ **Système cohérent** avec architecture existante

---

## 📚 Références

### Fichiers SQL
- `supabase-payment-system-setup.sql`: Création table transactions
- Lignes 10-44: Définition table
- Lignes 237-261: Modification enrollments

### Fichiers TypeScript
- `src/app/(dashboard)/checkout/page.tsx`: Checkout corrigé
- `src/app/(dashboard)/payment/success/page.tsx`: Page success (inchangée)
- `src/lib/payment/config.ts`: Configuration devises

---

**Status**: Système de paiement maintenant cohérent et fonctionnel ! 🎉
