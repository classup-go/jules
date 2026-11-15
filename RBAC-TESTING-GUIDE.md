# Guide de Test RBAC - Redirections par Rôle

## Protection Implémentée

### 1. Middleware Serveur (`middleware.ts`)
✅ Intercepte toutes les requêtes vers:
- `/teacher/*`
- `/student/*`
- `/search`
- `/find-teachers`
- `/classroom/*`
- `/lesson/*`

### 2. Layout Dashboard
✅ Vérifie le rôle lors du chargement initial

### 3. Guards Composants
✅ `TeacherGuard` - Protège toutes les pages `/teacher/*`
✅ `StudentGuard` - Protège toutes les pages `/student/*`

### 4. Page Search
✅ Vérification client-side supplémentaire pour rediriger les professeurs

---

## Scénarios de Test

### 🔴 Test 1: Étudiant essaie d'accéder à une route professeur

**Étapes:**
1. Se connecter en tant qu'étudiant
2. Vérifier la redirection vers `/student/home`
3. Dans la barre d'adresse, taper manuellement: `/teacher/dashboard`
4. Appuyer sur Entrée

**Résultat attendu:**
- ✅ Middleware intercepte la requête
- ✅ Redirection immédiate vers `/student/home`
- ✅ Message console: "Unauthorized access attempted"

**Autres URLs à tester:**
- `/teacher/classrooms`
- `/teacher/courses`
- `/teacher/homework`
- `/teacher/students`
- `/teacher/earnings`
- `/teacher/profile`

---

### 🔴 Test 2: Professeur essaie d'accéder à une route étudiant

**Étapes:**
1. Se connecter en tant que professeur
2. Vérifier la redirection vers `/teacher/dashboard`
3. Dans la barre d'adresse, taper manuellement: `/student/home`
4. Appuyer sur Entrée

**Résultat attendu:**
- ✅ Middleware intercepte la requête
- ✅ Redirection immédiate vers `/teacher/dashboard`

**Autres URLs à tester:**
- `/student/dashboard`
- `/student/my-courses`
- `/student/homework`
- `/student/assignments`

---

### 🔴 Test 3: Professeur essaie d'accéder à /search

**Étapes:**
1. Se connecter en tant que professeur
2. Dans la barre d'adresse, taper: `/search`
3. Appuyer sur Entrée

**Résultat attendu:**
- ✅ Middleware intercepte la requête
- ✅ Redirection immédiate vers `/teacher/dashboard`
- ✅ Professeur ne peut pas rechercher d'autres professeurs

---

### 🔴 Test 4: Professeur essaie d'accéder à /find-teachers

**Étapes:**
1. Se connecter en tant que professeur
2. Dans la barre d'adresse, taper: `/find-teachers`
3. Appuyer sur Entrée

**Résultat attendu:**
- ✅ Middleware intercepte la requête
- ✅ Redirection immédiate vers `/teacher/dashboard`

---

### 🟢 Test 5: Étudiant accède à /search (autorisé)

**Étapes:**
1. Se connecter en tant qu'étudiant
2. Cliquer sur "Rechercher" dans la navigation
3. Ou taper `/search` dans la barre d'adresse

**Résultat attendu:**
- ✅ Page s'affiche normalement
- ✅ Onglets "Cours" et "Professeurs" visibles
- ✅ Résultats de recherche disponibles

---

### 🟢 Test 6: Professeur accède à /teacher/dashboard (autorisé)

**Étapes:**
1. Se connecter en tant que professeur
2. Vérifier l'affichage du dashboard

**Résultat attendu:**
- ✅ Dashboard professeur s'affiche
- ✅ Statistiques visibles (étudiants, heures, revenus)
- ✅ Liste des classes récentes
- ✅ Devoirs à corriger

---

### 🟢 Test 7: Étudiant accède à /student/home (autorisé)

**Étapes:**
1. Se connecter en tant qu'étudiant
2. Vérifier l'affichage de la page d'accueil

**Résultat attendu:**
- ✅ Page d'accueil étudiant s'affiche
- ✅ Cours recommandés visibles
- ✅ Navigation étudiante accessible

---

### 🔴 Test 8: Utilisateur non connecté essaie d'accéder à une route protégée

**Étapes:**
1. Se déconnecter (ou ouvrir fenêtre privée)
2. Taper: `/teacher/dashboard`
3. Appuyer sur Entrée

**Résultat attendu:**
- ✅ Middleware intercepte la requête
- ✅ Redirection vers `/login`
- ✅ Message: "Veuillez vous connecter"

**Autres URLs à tester:**
- `/student/home`
- `/search`
- `/messages`
- `/notifications`

---

### 🔴 Test 9: Manipulation des routes imbriquées

**Étapes:**
1. Se connecter en tant qu'étudiant
2. Taper: `/teacher/classrooms/new`
3. Appuyer sur Entrée

**Résultat attendu:**
- ✅ Middleware intercepte (matcher: `/teacher/:path*`)
- ✅ Redirection vers `/student/home`

---

### 🔴 Test 10: Test des Guards au niveau des layouts

**Étapes:**
1. Se connecter en tant qu'étudiant
2. Via DevTools, désactiver le middleware (simulation)
3. Tenter d'accéder à `/teacher/dashboard`

**Résultat attendu:**
- ✅ Le `TeacherGuard` dans le layout détecte le mauvais rôle
- ✅ Affiche un écran de chargement "Vérification..."
- ✅ Redirige vers `/student/home`
- ⚠️ Ce test nécessite une manipulation technique

---

### 🟡 Test 11: Routes partagées accessibles par les deux rôles

**Routes à tester:**
- `/messages` - Messagerie (autorisée pour tous)
- `/notifications` - Notifications (autorisée pour tous)
- `/profile` - Profil utilisateur (autorisée pour tous)
- `/settings` - Paramètres (autorisée pour tous)

**Étapes:**
1. Se connecter en tant que professeur
2. Accéder à `/messages` → ✅ Doit fonctionner
3. Se déconnecter et se connecter en tant qu'étudiant
4. Accéder à `/messages` → ✅ Doit fonctionner

---

## Protection par Couche

| Couche | Type | Technologie | Fichier |
|--------|------|-------------|---------|
| 1️⃣ Serveur | Middleware | Next.js middleware | `middleware.ts` |
| 2️⃣ Layout | Client-side | React useEffect | `(dashboard)/layout.tsx` |
| 3️⃣ Section | Guard Component | React Guard | `teacher/layout.tsx`, `student/layout.tsx` |
| 4️⃣ Page | Client-side | React useEffect | `/search/page.tsx` |

---

## Commandes de Test Manuel

### Test avec différents utilisateurs

```bash
# Test en tant que professeur
# 1. Créer un compte professeur ou utiliser un existant
# 2. Se connecter
# 3. Essayer d'accéder: /student/home, /search

# Test en tant qu'étudiant
# 1. Créer un compte étudiant ou utiliser un existant
# 2. Se connecter
# 3. Essayer d'accéder: /teacher/dashboard, /teacher/courses
```

### Test de performance du middleware

```bash
# Vérifier les logs du middleware
# Dans le terminal Next.js, vérifier les redirections
# Aucun délai significatif ne devrait être observé
```

---

## Vérification de la Sécurité

### ✅ Checklist

- [ ] Professeur ne peut pas accéder aux routes `/student/*`
- [ ] Étudiant ne peut pas accéder aux routes `/teacher/*`
- [ ] Professeur ne peut pas accéder à `/search` ou `/find-teachers`
- [ ] Utilisateur non connecté est redirigé vers `/login`
- [ ] Routes partagées accessibles par les deux rôles
- [ ] Pas de contournement via manipulation d'URL
- [ ] Pas de contournement via historique du navigateur
- [ ] Guards fonctionnent même si middleware échoue
- [ ] Pas de flash de contenu non autorisé avant redirection

---

## Problèmes Potentiels & Solutions

### Problème 1: Double redirection
**Symptôme:** Page clignote ou boucle de redirection

**Solution:**
- Vérifier que le middleware et les guards ne se contredisent pas
- S'assurer que les chemins de redirection sont corrects

### Problème 2: Délai avant redirection
**Symptôme:** Utilisateur voit brièvement le contenu avant redirection

**Solution:**
- Le middleware agit côté serveur AVANT le rendu
- Les guards affichent un écran de chargement pendant la vérification

### Problème 3: Middleware ne s'exécute pas
**Symptôme:** Aucune redirection

**Solution:**
- Vérifier que `middleware.ts` est à la racine du projet
- Vérifier le `config.matcher`
- Redémarrer le serveur de développement

---

## Résultat Attendu Global

Après implémentation complète:

**Note de sécurité RBAC: 9/10** ✅

**Améliorations par rapport à avant:**
- ❌ Avant: 6/10 - Protection client-side uniquement
- ✅ Après: 9/10 - Protection serveur + client + guards

**Protection à 4 niveaux:**
1. ✅ Middleware serveur (intercepte les requêtes)
2. ✅ Layout dashboard (vérification client-side)
3. ✅ Guards de section (protection par rôle)
4. ✅ Vérification dans les pages (sécurité supplémentaire)

---

## Notes Importantes

1. **Le middleware est la défense principale** - Il bloque les requêtes côté serveur
2. **Les guards sont la défense secondaire** - En cas de contournement du middleware
3. **Les vérifications dans les pages** - Dernière ligne de défense
4. **Row-Level Security (RLS) dans Supabase** - Protection au niveau des données

**Recommandation:** Toujours tester manuellement après modifications des routes ou de l'authentification.
