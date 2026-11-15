# 🔍 Diagnostic: Erreur "Error saving quiz: {}"

**Problème**: Le quiz ne se sauvegarde pas lors de la création d'une leçon.

---

## Étape 1: Vérifier la structure de la table `lessons`

Exécutez cette requête dans Supabase SQL Editor:

```sql
-- Voir la structure de la table lessons
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'lessons'
ORDER BY ordinal_position;
```

**Cherchez particulièrement**:
- ✅ `chapter_id` (UUID)
- ✅ `classroom_id` (UUID) - Est-ce qu'elle existe?
- ✅ `teacher_id` (UUID) - Est-ce qu'elle existe?

---

## Étape 2: Vérifier les policies RLS

```sql
-- Voir les policies actuelles
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'lesson_quizzes';
```

---

## Étape 3: Corriger la policy (selon le résultat)

### Si `lessons` a directement `classroom_id`:

Exécutez [fix-quiz-rls-policy.sql](fix-quiz-rls-policy.sql) (partie 1).

### Si `lessons` passe par `chapters`:

Exécutez [fix-quiz-rls-policy.sql](fix-quiz-rls-policy.sql) (partie commentée).

---

## Étape 4: Tester

1. Rafraîchissez la page
2. Créez une nouvelle leçon QCM
3. Configurez le quiz (ajoutez 1-2 questions)
4. Cliquez sur "✓ Enregistrer le quiz" (bouton vert dans le QuizEditor)
5. Cliquez sur "💾 Enregistrer la leçon"
6. **Regardez la console** (F12)

**Résultat attendu**:
```
Saving quiz: { lesson_id: "...", quiz_type: "qcm", data: {...} }
Quiz saved successfully: [...]
```

**Si erreur**:
```
Error saving quiz: { code: "...", message: "..." }
```

Notez le code d'erreur et partagez-le.

---

## Codes d'erreur courants

- **42501**: Permission denied (RLS policy bloque)
  → Exécutez le script fix-quiz-rls-policy.sql

- **23503**: Foreign key violation
  → Le lesson_id n'existe pas ou est invalide

- **23505**: Duplicate key (quiz déjà créé pour cette leçon)
  → Supprimez l'ancien: `DELETE FROM lesson_quizzes WHERE lesson_id = '...'`

---

**Commençons par l'étape 1 - partagez les résultats de la structure de `lessons`.**
