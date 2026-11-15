# 🔧 Fix: Erreur lors de la création de la classe

**Date**: 2026-01-21
**Erreur**: "Erreur lors de la création de la classe" dans ClassWizard

## 🔍 Problème Identifié

L'API `/api/classes` retournait une erreur générique sans détails, rendant le diagnostic difficile.

## ✅ Corrections Appliquées

### 1. Ajout du champ `enrolled_count` (ligne 44)
**Fichier**: `src/app/api/classes/route.ts`

**Avant**:
```typescript
.insert({
  teacher_id: user.id,
  title: body.title,
  description: body.description || '',
  subject: body.subject,
  level: body.level,
  is_public: body.is_public || false,
  max_students: body.max_students || 100,
  price: body.price || 0,
  is_free: body.is_free !== undefined ? body.is_free : true,
})
```

**Après**:
```typescript
.insert({
  teacher_id: user.id,
  title: body.title,
  description: body.description || '',
  subject: body.subject,
  level: body.level,
  is_public: body.is_public || false,
  max_students: body.max_students || 100,
  enrolled_count: 0, // ✅ Ajouté - défaut 0 pour nouvelle classe
  price: body.price || 0,
  is_free: body.is_free !== undefined ? body.is_free : true,
})
```

### 2. Amélioration des messages d'erreur (lignes 49-56)
**Fichier**: `src/app/api/classes/route.ts`

**Avant**:
```typescript
if (classroomError) {
  console.error('Error creating classroom:', classroomError)
  return NextResponse.json(
    { error: 'Erreur lors de la création de la classe' },
    { status: 500 }
  )
}
```

**Après**:
```typescript
if (classroomError) {
  console.error('Error creating classroom:', classroomError)
  return NextResponse.json(
    {
      error: 'Erreur lors de la création de la classe',
      details: classroomError.message,  // ✅ Détails de l'erreur
      code: classroomError.code          // ✅ Code d'erreur
    },
    { status: 500 }
  )
}
```

### 3. Ajout de logs de débogage (lignes 33-40)
**Fichier**: `src/app/api/classes/route.ts`

```typescript
// Log the request for debugging
console.log('Creating classroom with data:', {
  teacher_id: user.id,
  title: body.title,
  subject: body.subject,
  level: body.level,
  is_public: body.is_public
})
```

### 4. Affichage des détails d'erreur dans l'UI (ligne 113)
**Fichier**: `src/components/class-wizard/ClassWizard.tsx`

**Avant**:
```typescript
if (!classResponse.ok) {
  const errorData = await classResponse.json()
  throw new Error(errorData.error || 'Erreur lors de la création de la classe')
}
```

**Après**:
```typescript
if (!classResponse.ok) {
  const errorData = await classResponse.json()
  const errorMessage = errorData.details
    ? `${errorData.error}: ${errorData.details}`  // ✅ Affiche les détails
    : errorData.error || 'Erreur lors de la création de la classe'
  throw new Error(errorMessage)
}
```

## 🧪 Test Après les Corrections

### Étape 1: Vérifier la console du serveur
Lorsque vous essayez de créer une classe, regardez dans la **console du terminal Next.js**:

```
Creating classroom with data: {
  teacher_id: 'xxx-xxx-xxx',
  title: 'Mathématiques Terminale S',
  subject: 'Mathématiques',
  level: 'Lycée',
  is_public: false
}
```

Si une erreur se produit, vous verrez maintenant:
```
Error creating classroom: {
  message: '...',
  code: '...',
  details: '...'
}
```

### Étape 2: Vérifier l'erreur affichée dans l'UI
L'erreur dans le navigateur montrera maintenant le **message détaillé**:
```
❌ Erreur lors de la création de la classe: [détails spécifiques]
```

## 🔍 Causes Possibles de l'Erreur

### 1. L'utilisateur n'a pas le rôle 'teacher' ✅
**Symptôme**: Erreur "Accès réservé aux enseignants"

**Solution**: Vérifiez dans Supabase:
```sql
SELECT id, email, role FROM users WHERE id = 'VOTRE_USER_ID';
```

Si `role != 'teacher'`, mettez à jour:
```sql
UPDATE users SET role = 'teacher' WHERE id = 'VOTRE_USER_ID';
```

### 2. Champs NOT NULL manquants dans la table `classrooms` ✅
**Symptôme**: Erreur "null value in column violates not-null constraint"

**Solution**: Vérifiez la structure de la table:
```sql
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'classrooms'
  AND is_nullable = 'NO'
  AND column_default IS NULL;
```

**Correction déjà appliquée**: `enrolled_count: 0` ajouté dans l'API

### 3. Référence foreign key invalide ✅
**Symptôme**: Erreur "foreign key constraint"

**Solution**: Vérifiez que l'utilisateur existe dans la table users:
```sql
SELECT id, email FROM users WHERE id = 'VOTRE_USER_ID';
```

### 4. Contrainte UNIQUE violée ✅
**Symptôme**: Erreur "duplicate key value violates unique constraint"

**Solution**: Une classe avec le même nom existe déjà. Changez le nom.

## 📋 Checklist de Débogage

Suivez ces étapes dans l'ordre:

### ✅ 1. Vérifier que vous êtes connecté
```typescript
// Dans la console du navigateur (F12)
const { data, error } = await window.supabase.auth.getUser()
console.log('User:', data.user)
```

### ✅ 2. Vérifier votre rôle
```sql
-- Dans Supabase SQL Editor
SELECT id, email, role FROM users WHERE email = 'VOTRE_EMAIL';
```

Si le rôle n'est pas 'teacher', exécutez:
```sql
UPDATE users SET role = 'teacher' WHERE email = 'VOTRE_EMAIL';
```

### ✅ 3. Tester la création de classe
1. Allez sur `/teacher/classes/create`
2. Remplissez le formulaire
3. **Avant de soumettre**, ouvrez la console du navigateur (F12)
4. Soumettez le formulaire
5. Regardez la **console du terminal Next.js** ET la **console du navigateur**

### ✅ 4. Analyser l'erreur détaillée
Le message d'erreur devrait maintenant contenir:
- Le message d'erreur principal
- Les détails techniques (`details`)
- Le code d'erreur (`code`)

## 🚀 Prochaines Étapes

1. **Essayez de créer une classe à nouveau**
2. **Copiez le message d'erreur complet** (il sera plus détaillé maintenant)
3. **Vérifiez les logs dans le terminal** où Next.js tourne
4. Si l'erreur persiste, partagez:
   - Le message d'erreur complet de l'UI
   - Les logs du terminal Next.js
   - Le résultat de la requête SQL de vérification du rôle

## 📁 Fichiers Modifiés

```
✅ Modifiés:
   ├── src/app/api/classes/route.ts
   │   ├── Ajout de enrolled_count: 0
   │   ├── Amélioration des messages d'erreur
   │   └── Ajout de logs de débogage
   │
   └── src/components/class-wizard/ClassWizard.tsx
       └── Affichage des détails d'erreur dans l'UI
```

## 🔑 Points Clés

1. **`enrolled_count: 0` ajouté** - Si c'était ça le problème, ça devrait être résolu
2. **Messages d'erreur détaillés** - Vous verrez maintenant exactement ce qui ne va pas
3. **Logs de débogage** - Vérifiez la console du terminal pour les détails
4. **Rôle 'teacher' requis** - Vérifiez dans Supabase que votre utilisateur a le bon rôle

---

**🔍 Prochaine Action**: Essayez de créer une classe et observez le message d'erreur détaillé.
