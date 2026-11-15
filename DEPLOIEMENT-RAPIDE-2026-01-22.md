# 🚀 DÉPLOIEMENT RAPIDE - PROGRAMME UNIFIÉ

## Guide ultra-rapide pour mettre en production

---

## 📋 PRÉREQUIS

- [ ] PostgreSQL accessible
- [ ] Node.js et npm/pnpm installés
- [ ] Accès au repo Jules Platform
- [ ] Variables d'environnement configurées

---

## 🗄️ ÉTAPE 1: MIGRATIONS BASE DE DONNÉES

### Backup obligatoire

```bash
pg_dump jules_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Exécuter les 3 migrations dans l'ordre

```bash
# Migration 002 - Prérequis (colonnes manquantes)
psql -d jules_db -f migrations/002-add-missing-columns.sql

# Migration 003 - Modèle Programme Unifié
psql -d jules_db -f migrations/003-unified-programme-model.sql

# Migration 004 - Intégration Slides
psql -d jules_db -f migrations/004-integrate-slides-into-lessons.sql
```

### Vérifier

```bash
psql -d jules_db -c "SELECT COUNT(*) FROM courses WHERE settings IS NOT NULL;"
```

**Attendu:** Nombre de cours avec settings

---

## 📦 ÉTAPE 2: CODE FRONTEND

### Copier les fichiers

#### Types
```bash
cp src/types/programme.ts <PROJET>/src/types/
```

#### Composants Wizard
```bash
cp -r src/components/programme-wizard/ <PROJET>/src/components/
```

#### Composants LessonEditor
```bash
cp -r src/components/lesson-editor/ <PROJET>/src/components/
```

#### API Routes
```bash
cp -r src/app/api/programmes/ <PROJET>/src/app/api/
```

#### Pages Teacher
```bash
cp -r src/app/(dashboard)/teacher/programmes/ <PROJET>/src/app/(dashboard)/teacher/
```

#### Pages Student
```bash
cp -r src/app/(dashboard)/student/programmes/ <PROJET>/src/app/(dashboard)/student/
```

---

## 🔨 ÉTAPE 3: BUILD & INSTALL

```bash
cd <PROJET>

# Installer les dépendances (si nouvelles)
pnpm install

# Build TypeScript
pnpm build

# Vérifier les erreurs
pnpm typecheck
```

---

## ✅ ÉTAPE 4: TESTS RAPIDES

### Test 1: Accès pages teacher
```
http://localhost:3000/teacher/programmes
http://localhost:3000/teacher/programmes/new
```

### Test 2: Créer un programme
1. Aller sur `/teacher/programmes/new`
2. Remplir Step 1 (Info)
3. Sélectionner un preset Step 2 (Configuration)
4. Ajouter 1 chapitre + 1 leçon Step 3 (Content)
5. Définir prix Step 4 (Pricing)
6. Publier Step 5 (Publication)

**Attendu:** Programme créé et redirection vers détails

### Test 3: Accès pages student
```
http://localhost:3000/student/programmes
```

**Attendu:** Liste des programmes publiés

### Test 4: LessonEditor
1. Créer un programme
2. Ajouter une leçon
3. Tester les 3 onglets: Texte, Vidéo, Slides
4. Sauvegarder

**Attendu:** Leçon créée avec le bon type de contenu

---

## 📊 ÉTAPE 5: VÉRIFICATIONS SQL

### Vérification 1: Colonnes courses
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'courses'
  AND column_name IN ('settings', 'target_audience', 'enrolled_count');
```
**Attendu:** 3 lignes

### Vérification 2: Vue lessons_with_content
```sql
SELECT content_type, COUNT(*)
FROM lessons_with_content
GROUP BY content_type;
```
**Attendu:** Aucune erreur

### Vérification 3: RLS presentations
```sql
SELECT policyname
FROM pg_policies
WHERE tablename = 'presentations';
```
**Attendu:** 5 policies

---

## 🎯 CHECKLIST FINALE

### Base de données
- [ ] Backup créé
- [ ] 3 migrations exécutées sans erreur
- [ ] Vue `lessons_with_content` existe
- [ ] Index `idx_courses_settings_gin` existe
- [ ] RLS policies créées

### Frontend
- [ ] Tous les fichiers copiés
- [ ] Build réussi sans erreur
- [ ] Pas d'erreurs TypeScript
- [ ] Pages accessibles

### Tests
- [ ] Page liste programmes fonctionne
- [ ] Wizard création fonctionne
- [ ] Les 4 presets fonctionnent
- [ ] LessonEditor sauvegarde
- [ ] Filtres et recherche OK

---

## 🚨 EN CAS DE PROBLÈME

### Erreur: Column does not exist
➡️ Vérifier que migration 002 est bien passée
```sql
SELECT column_name FROM information_schema.columns WHERE table_name = 'courses';
```

### Erreur: Cannot find module '@/types/programme'
➡️ Vérifier que le fichier est copié et le path est correct

### Erreur: API 404
➡️ Vérifier que les routes API sont dans le bon dossier:
```
src/app/api/programmes/route.ts
src/app/api/programmes/[id]/route.ts
```

### Build errors
➡️ Vérifier les imports manquants:
```bash
pnpm install @radix-ui/react-tabs
pnpm install @radix-ui/react-accordion
pnpm install lucide-react
```

---

## 📚 DOCUMENTATION COMPLÈTE

Pour plus de détails, consulter:

- **[DEMARRAGE-RAPIDE-MIGRATIONS.md](DEMARRAGE-RAPIDE-MIGRATIONS.md)** - Migrations en 3 étapes
- **[README-MIGRATIONS.md](README-MIGRATIONS.md)** - Guide complet migrations
- **[IMPLEMENTATION-FINALE-COMPLETE-2026-01-22.md](IMPLEMENTATION-FINALE-COMPLETE-2026-01-22.md)** - Vue d'ensemble complète
- **[SYNTHESE-SESSION-2026-01-22.md](SYNTHESE-SESSION-2026-01-22.md)** - Synthèse détaillée

---

## ⏱️ TEMPS ESTIMÉ

- Migrations BDD: **5-10 minutes**
- Copie fichiers: **5 minutes**
- Build & install: **5-10 minutes**
- Tests rapides: **10-15 minutes**

**Total: 25-40 minutes**

---

## 🎉 APRÈS LE DÉPLOIEMENT

### Créer les 4 types de programmes de test

1. **Masterclass (preset court)**
   - Durée: Court
   - Rythme: Libre
   - Accès: Individuel

2. **Bootcamp (preset intensif)**
   - Durée: Court
   - Rythme: Live
   - Accès: Classe privée

3. **Cursus (preset long)**
   - Durée: Long
   - Rythme: Guidé
   - Accès: Individuel

4. **Formation hybride (preset mixte)**
   - Durée: Moyen
   - Rythme: Guidé
   - Accès: Mixte

### Tester les 3 types de contenu

- [ ] Créer une leçon avec **texte** (Markdown)
- [ ] Créer une leçon avec **vidéo** (YouTube/Vimeo)
- [ ] Créer une leçon avec **slides** (présentation existante)

### Vérifier la vue étudiant

- [ ] Affichage correct du catalogue
- [ ] Filtres fonctionnent
- [ ] Inscription fonctionne (si implémenté)
- [ ] Navigation chapitres/leçons

---

## 📞 SUPPORT

En cas de problème:
1. Vérifier les logs PostgreSQL
2. Vérifier les logs Next.js
3. Consulter la documentation détaillée
4. Restaurer le backup si nécessaire

---

**Date:** 22 janvier 2026
**Version:** 1.0
**Statut:** ✅ Prêt pour déploiement

🚀 **Bon déploiement!**
