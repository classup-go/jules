# 🔧 FIX: Accès Étudiant aux Sessions Live

**Date:** 19 janvier 2026
**Problème rapporté:** "Session terminée" alors que le professeur l'a démarrée

---

## 🔴 PROBLÈME IDENTIFIÉ

### Symptôme
1. Professeur crée une session pour un cours
2. Professeur démarre la session (status → 'live')
3. Étudiant inscrit au cours essaie de rejoindre
4. **Erreur:** "Accès refusé" ou "Session terminée"

### Cause Racine

**Erreur dans l'API `/api/sessions/[id]/route.ts`:**
- Ligne 69: Vérification enrollment utilisait `student_id` au lieu de `user_id`
- La table `enrollments` utilise la colonne `user_id`, pas `student_id`
- Résultat: L'étudiant n'était jamais reconnu comme inscrit → Accès refusé

```typescript
// ❌ AVANT (INCORRECT)
.eq('student_id', user.id)  // Colonne n'existe pas!

// ✅ APRÈS (CORRECT)
.eq('user_id', user.id)     // Colonne correcte
```

---

## ✅ CORRECTIONS APPLIQUÉES

### 1. Fix Colonne Enrollment (CRITIQUE)

**Fichier:** `src/app/api/sessions/[id]/route.ts`
**Ligne:** 69

```typescript
// AVANT
const { data: enrollment } = await supabase
  .from('enrollments')
  .select('id')
  .eq('classroom_id', session.classroom_id)
  .eq('student_id', user.id)  // ❌ ERREUR ICI
  .eq('status', 'active')
  .single()

// APRÈS
const { data: enrollment, error: enrollmentError } = await supabase
  .from('enrollments')
  .select('id')
  .eq('classroom_id', session.classroom_id)
  .eq('user_id', user.id)     // ✅ CORRIGÉ
  .eq('status', 'active')
  .single()
```

**Impact:** Les étudiants peuvent maintenant accéder aux sessions des cours auxquels ils sont inscrits.

---

### 2. Ajout Logs Debug

**Fichier:** `src/app/api/sessions/[id]/route.ts`

Ajout de logs pour diagnostiquer les problèmes d'accès:

```typescript
console.log('Enrollment check:', {
  classroom_id: session.classroom_id,
  user_id: user.id,
  enrollment,
  enrollmentError
})

console.log('Permission check:', {
  user_id: user.id,
  session_id: id,
  session_type: session.session_type,
  classroom_id: session.classroom_id,
  teacher_id: session.teacher_id,
  student_id: session.student_id,
  isTeacher,
  isOneToOneStudent,
  isEnrolled
})
```

**Utilité:**
- Voir dans les logs serveur pourquoi un accès est refusé
- Identifier si c'est un problème d'enrollment, de classroom_id, etc.

---

### 3. Message d'Erreur Amélioré (API)

**Fichier:** `src/app/api/sessions/[id]/route.ts`

```typescript
// AVANT
return NextResponse.json(
  { error: 'Accès refusé' },
  { status: 403 }
)

// APRÈS
return NextResponse.json(
  { error: 'Accès refusé - Vous devez être inscrit à ce cours pour accéder à cette session' },
  { status: 403 }
)
```

**Impact:** L'étudiant comprend pourquoi l'accès est refusé.

---

### 4. Page Erreur Enrichie (Frontend)

**Fichier:** `src/app/(dashboard)/session/[id]/page.tsx`

**Gestion spéciale erreur 403:**

```typescript
if (response.status === 403) {
  const error = await response.json()
  setError(error.error || 'Accès refusé à cette session')
  setLoading(false)
  return
}
```

**Affichage amélioré:**

```jsx
{isAccessDenied && (
  <>
    <div className="mb-6 p-4 bg-blue-50 rounded-xl text-left">
      <p className="text-sm text-blue-800 mb-2">
        💡 Pour accéder à cette session, vous devez être inscrit au cours correspondant.
      </p>
    </div>

    <button
      onClick={() => router.push('/student/my-courses')}
      className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
    >
      Voir mes cours
    </button>
  </>
)}
```

**Impact:**
- Message clair avec icône 🔒
- Explication de la raison du blocage
- Bouton direct vers "Mes cours" pour s'inscrire

---

### 5. Lien "Mes Sessions Live" dans Dashboard

**Fichier:** `src/app/(dashboard)/student/dashboard/page.tsx`
**Ligne:** 653

```typescript
<div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
  <h2>🎥 Prochaines sessions live</h2>
  <Link href="/student/sessions" style={{ color: '#2b8cee', fontSize: '14px', fontWeight: '500' }}>
    Voir toutes mes sessions →
  </Link>
</div>
```

**Impact:** Étudiant peut accéder facilement à la page complète des sessions.

---

## 🧪 DIAGNOSTIC

### Comment Vérifier si un Étudiant est Inscrit à un Cours

**Dans la console SQL de Supabase:**

```sql
-- Remplacer les UUIDs par les vraies valeurs
SELECT
  e.id as enrollment_id,
  e.user_id,
  e.classroom_id,
  e.status,
  c.title as course_title,
  u.display_name as student_name
FROM enrollments e
JOIN classrooms c ON c.id = e.classroom_id
JOIN users u ON u.id = e.user_id
WHERE e.user_id = 'UUID_ETUDIANT'
AND e.classroom_id = 'UUID_COURS'
AND e.status = 'active';
```

**Si la requête retourne 0 lignes:**
→ L'étudiant N'EST PAS inscrit au cours
→ Il ne peut pas accéder aux sessions de ce cours

**Solution:** Inscrire l'étudiant au cours via l'interface ou SQL:

```sql
INSERT INTO enrollments (user_id, classroom_id, status, enrolled_at)
VALUES (
  'UUID_ETUDIANT',
  'UUID_COURS',
  'active',
  NOW()
);
```

---

### Comment Vérifier les Logs Serveur

**Avec les nouveaux logs ajoutés, vous verrez dans la console:**

```
Enrollment check: {
  classroom_id: 'abc-123-def',
  user_id: 'student-uuid',
  enrollment: null,              ← NULL = pas inscrit!
  enrollmentError: null
}

Permission check: {
  user_id: 'student-uuid',
  session_id: 'session-uuid',
  session_type: 'group',
  classroom_id: 'abc-123-def',
  teacher_id: 'teacher-uuid',
  student_id: null,
  isTeacher: false,
  isOneToOneStudent: false,
  isEnrolled: false              ← FALSE = accès refusé
}

Access denied for user: student-uuid to session: session-uuid
```

**Interprétation:**
- `enrollment: null` → L'étudiant n'est pas inscrit au cours
- `isEnrolled: false` → Accès refusé
- **Action:** Inscrire l'étudiant au cours

---

## 🔍 CHECKLIST DE VÉRIFICATION

### Pour le Professeur

- [ ] Créer une session de groupe
- [ ] Sélectionner un cours existant
- [ ] Vérifier que `classroom_id` est renseigné (voir logs)
- [ ] Démarrer la session
- [ ] Vérifier que status = 'live'

### Pour l'Étudiant

- [ ] Être inscrit au cours de la session (vérifier via SQL ou UI)
- [ ] Status enrollment = 'active'
- [ ] Aller sur `/student/sessions`
- [ ] Vérifier que la session live apparaît dans la section rouge
- [ ] Cliquer "Rejoindre maintenant"
- [ ] Arriver sur le lobby (pas d'erreur 403)
- [ ] Cliquer "Rejoindre la session"
- [ ] Entrer dans LiveRoom

---

## 📊 MATRICE DES CAS

| Cas | Session Type | Classroom ID | Student Enrolled | Résultat |
|-----|--------------|--------------|------------------|----------|
| 1 | group | ✅ Renseigné | ✅ Oui | ✅ ACCÈS OK |
| 2 | group | ✅ Renseigné | ❌ Non | ❌ Accès refusé (OK) |
| 3 | group | ❌ NULL | ❌ Non | ❌ Accès refusé (OK) |
| 4 | one_to_one | NULL | student_id match | ✅ ACCÈS OK |
| 5 | one_to_one | NULL | student_id ≠ | ❌ Accès refusé (OK) |

**Cas typique du problème:** Cas #2
- Session de groupe créée
- Classroom_id renseigné
- **MAIS** l'étudiant n'est pas inscrit au cours
- **Avant le fix:** Vérification échouait à cause de `student_id` au lieu de `user_id`
- **Après le fix:** Vérification fonctionne, message clair "vous devez être inscrit"

---

## 🚀 DÉPLOIEMENT

### Étapes

1. **Vérifier les modifications:**
   ```bash
   git diff src/app/api/sessions/[id]/route.ts
   git diff src/app/(dashboard)/session/[id]/page.tsx
   git diff src/app/(dashboard)/student/dashboard/page.tsx
   ```

2. **Tester le scénario complet:**
   - Créer un cours
   - Inscrire un étudiant au cours
   - Créer une session pour ce cours
   - Démarrer la session (prof)
   - Rejoindre la session (étudiant)
   - Vérifier aucun "Accès refusé"

3. **Tester le cas d'erreur:**
   - Créer une session
   - NE PAS inscrire l'étudiant
   - Étudiant tente de rejoindre
   - Vérifier message clair + bouton "Voir mes cours"

4. **Vérifier les logs:**
   - Regarder la console serveur
   - Confirmer que les logs s'affichent correctement
   - Utiliser pour diagnostiquer futurs problèmes

---

## 📝 NOTES TECHNIQUES

### Schéma Table `enrollments`

```sql
CREATE TABLE enrollments (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),      ← Colonne correcte
  classroom_id UUID NOT NULL REFERENCES classrooms(id),
  status VARCHAR(20) DEFAULT 'active',
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  ...
)
```

**Important:** La colonne s'appelle `user_id`, pas `student_id`!

### Schéma Table `live_sessions`

```sql
CREATE TABLE live_sessions (
  id UUID PRIMARY KEY,
  teacher_id UUID NOT NULL,
  classroom_id UUID NULL,           ← NULL pour sessions 1-to-1
  student_id UUID NULL,             ← Pour sessions 1-to-1 uniquement
  session_type VARCHAR(20),         ← 'group' ou 'one_to_one'
  status VARCHAR(20) DEFAULT 'scheduled',
  ...
)
```

**Logique d'accès:**
- **Si session_type = 'group':** Vérifier enrollment au cours (classroom_id)
- **Si session_type = 'one_to_one':** Vérifier student_id = user.id

---

## 🐛 BUGS CONNUS RÉSOLUS

### Bug #1: student_id au lieu de user_id
- **Symptôme:** Tous les étudiants inscrits recevaient "Accès refusé"
- **Cause:** Requête cherchait colonne inexistante
- **Fix:** Ligne 69 de `/api/sessions/[id]/route.ts`
- **Statut:** ✅ RÉSOLU

### Bug #2: Message d'erreur non explicite
- **Symptôme:** "Accès refusé" sans explication
- **Cause:** Message générique
- **Fix:** Message détaillé + UI améliorée
- **Statut:** ✅ RÉSOLU

### Bug #3: Pas de lien vers sessions dans dashboard
- **Symptôme:** Étudiant ne savait pas où trouver la page sessions
- **Cause:** Aucun lien direct
- **Fix:** Ajout "Voir toutes mes sessions →"
- **Statut:** ✅ RÉSOLU

---

## 🔮 AMÉLIORATIONS FUTURES

### Court Terme

1. **Notification Push WebSocket**
   - Notifier l'étudiant quand le prof démarre la session
   - Plus besoin d'attendre 10s (auto-refresh)

2. **Badge "Nouveau" sur Sessions Live**
   - Afficher badge sur sessions démarrées récemment (< 5min)
   - Attire l'attention de l'étudiant

3. **Auto-enrollment Sessions**
   - Option pour professeur: "Permettre inscription directe via session"
   - Étudiant non-inscrit peut s'inscrire au cours depuis la page session

### Moyen Terme

4. **Gestion Invitations**
   - Professeur peut envoyer invitation par email
   - Lien direct qui inscrit automatiquement au cours si nécessaire

5. **Notification Email/SMS**
   - 10min avant le début de la session
   - Quand le prof démarre la session

---

## ✅ RÉSUMÉ

**Problème initial:** Étudiant ne pouvait pas rejoindre session live malgré inscription au cours.

**Cause:** Bug API vérification enrollment (mauvais nom de colonne).

**Corrections:**
1. ✅ Fix colonne `user_id` vs `student_id`
2. ✅ Logs debug pour diagnostics futurs
3. ✅ Messages d'erreur explicites
4. ✅ UI améliorée avec bouton "Voir mes cours"
5. ✅ Lien vers sessions dans dashboard

**Résultat:**
- Étudiant inscrit peut maintenant rejoindre les sessions live
- Étudiant non-inscrit reçoit un message clair avec action à prendre
- Diagnostics facilités avec logs serveur

---

## 📞 SUPPORT

**En cas de problème "Accès refusé":**

1. **Vérifier logs serveur** - Les nouveaux logs montreront exactement pourquoi
2. **Vérifier enrollment SQL** - Requête fournie dans section Diagnostic
3. **Vérifier classroom_id** - Session doit avoir un classroom_id pour les sessions de groupe
4. **Vérifier status enrollment** - Doit être 'active'

**Logs utiles à partager pour debug:**
```
Enrollment check: { ... }
Permission check: { ... }
```

---

**🎉 Le système d'accès aux sessions live est maintenant robuste et debuggable!**
