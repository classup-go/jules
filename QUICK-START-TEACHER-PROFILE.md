# 🚀 Démarrage Rapide - Système de Profil Professeur

## ⚡ Installation en 3 Minutes

### Étape 1: Exécuter le Script SQL

Dans **Supabase SQL Editor**:

1. Copier le contenu de `supabase-teacher-profile-enhancement.sql`
2. Coller dans l'éditeur SQL
3. Exécuter (Run)

✅ Vous devriez voir: "Profil professeur amélioré avec succès !"

### Étape 2: Vérification

```sql
-- Vérifier que les colonnes ont été ajoutées
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('subjects', 'levels', 'teaching_mode', 'hourly_rate');

-- Résultat attendu: 4 lignes
```

### Étape 3: Test

1. **Ouvrir** http://localhost:3001
2. **Se connecter** en tant que **professeur**
3. **Aller sur** `/teacher/profile/complete`
4. **Compléter** les 4 étapes du wizard
5. **Enregistrer** le profil

---

## 📁 Fichiers Créés

### SQL
- `supabase-teacher-profile-enhancement.sql` - Script complet

### Types
- `src/types/teacher-profile.ts` - Types TypeScript

### Pages
- `/teacher/profile/complete` - Wizard de profil (4 étapes)
- `/find-teachers` - Recherche de professeurs (étudiants)
- `/teachers/[id]` - Profil public du professeur

### Documentation
- `TEACHER-PROFILE-SYSTEM-GUIDE.md` - Guide complet
- `QUICK-START-TEACHER-PROFILE.md` - Ce fichier

---

## 🎯 Fonctionnalités

### ✅ Opérationnel

**Pour les Professeurs:**
- ✅ Wizard de complétion en 4 étapes
- ✅ Informations de base (nom, tél, ville, bio, expérience)
- ✅ Matières et niveaux enseignés (multi-sélection)
- ✅ Modes d'enseignement (en ligne, présentiel, domicile)
- ✅ Tarification (prix horaire, déplacement)
- ✅ Qualifications (spécialités, diplômes, langues)
- ✅ Indicateur de complétion du profil (%)

**Pour les Étudiants:**
- ✅ Recherche avec filtres multiples
- ✅ Affichage en grille des résultats
- ✅ Profil public détaillé
- ✅ Visualisation des avis

### 🚧 À Développer

- 📅 Calendrier de disponibilités
- 💬 Système de messagerie
- 💳 Paiement en ligne
- ⭐ Système d'avis complet
- 🔔 Notifications

---

## 📊 Nouvelles Colonnes (Table `users`)

### Coordonnées
- `phone` TEXT - Téléphone
- `address` TEXT - Adresse
- `city` TEXT - Ville
- `postal_code` TEXT - Code postal

### Profil Professeur
- `bio` TEXT - Biographie
- `experience` TEXT - Années d'expérience
- `subjects` TEXT[] - Matières
- `levels` TEXT[] - Niveaux
- `teaching_mode` TEXT[] - Modes

### Tarification
- `hourly_rate` DECIMAL - Prix horaire
- `can_travel` BOOLEAN - Se déplace
- `travel_distance` INTEGER - Distance max

### Qualifications
- `specialties` TEXT[] - Spécialités
- `certifications` TEXT[] - Diplômes
- `languages` TEXT[] - Langues

### Statistiques
- `rating` DECIMAL - Note moyenne
- `total_reviews` INTEGER - Nombre d'avis
- `total_students` INTEGER - Élèves
- `profile_completed` BOOLEAN - Complet
- `verified` BOOLEAN - Vérifié
- `is_available` BOOLEAN - Disponible

---

## 📝 Nouvelles Tables

### `teacher_reviews`
Avis des étudiants sur les professeurs
- `id`, `teacher_id`, `student_id`
- `rating` (1-5), `comment`
- Note mise à jour automatiquement

### `teacher_availability`
Créneaux de disponibilités
- `id`, `teacher_id`
- `day_of_week` (0-6)
- `start_time`, `end_time`

---

## 🎨 URLs Importantes

| URL | Description | Pour |
|-----|-------------|------|
| `/teacher/profile/complete` | Compléter son profil | Professeurs |
| `/find-teachers` | Rechercher un professeur | Étudiants |
| `/teachers/[id]` | Voir profil public | Tous |

---

## 🔍 Recherche (Filtres Disponibles)

**Étudiants peuvent filtrer par:**
- ✅ Matière (Maths, Français, etc.)
- ✅ Niveau (6ème à Terminale, Supérieur, Adulte)
- ✅ Ville (recherche textuelle)
- ✅ Mode (en ligne, présentiel, domicile)
- ✅ Note minimum (3+, 4+, 4.5+ étoiles)
- ✅ Tarif maximum (€/h)
- ✅ Peut se déplacer (checkbox)

---

## 🎓 Exemple d'Utilisation

### Professeur: Compléter son Profil

**Étape 1: Informations**
```
Nom: Jean Dupont
Téléphone: 06 12 34 56 78
Ville: Paris
Bio: "Professeur agrégé de mathématiques avec 10 ans d'expérience..."
Expérience: 10+ ans
```

**Étape 2: Enseignement**
```
Matières: Mathématiques, Physique-Chimie
Niveaux: Terminale, Licence, Master
Modes: En ligne ✓, Présentiel ✓
```

**Étape 3: Tarifs**
```
Tarif: 35€/h
Peut se déplacer: Oui
Distance: 15 km
```

**Étape 4: Qualifications**
```
Spécialités: Préparation Bac, Préparation Concours
Diplômes: Agrégation Mathématiques, Master MEEF
Langues: Français, Anglais
```

### Étudiant: Trouver un Prof

1. Aller sur `/find-teachers`
2. Filtrer:
   - Matière: Mathématiques
   - Niveau: Terminale
   - Ville: Paris
   - Tarif max: 40€
3. Parcourir les résultats
4. Cliquer sur une carte
5. Voir le profil complet
6. Cliquer "Contacter"

---

## 🛠️ Dépannage

### Erreur: "column does not exist"

Les colonnes n'ont pas été créées.

**Solution:**
```sql
-- Vérifier les colonnes
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users';

-- Relancer le script
-- supabase-teacher-profile-enhancement.sql
```

### Le profil ne se complète pas à 100%

Le trigger SQL vérifie automatiquement.

**Vérifier:**
```sql
SELECT
  display_name, phone, city, bio, experience,
  array_length(subjects, 1) as nb_subjects,
  array_length(levels, 1) as nb_levels,
  array_length(teaching_mode, 1) as nb_modes,
  hourly_rate,
  profile_completed
FROM users
WHERE role = 'teacher'
AND id = 'votre-id';
```

**Requis pour 100%:**
- Nom ✓
- Téléphone ✓
- Ville ✓
- Bio ✓
- Expérience ✓
- Au moins 1 matière ✓
- Au moins 1 niveau ✓
- Au moins 1 mode ✓
- Tarif > 0 ✓
- 1 spécialité OU 1 diplôme ✓

### Aucun professeur dans la recherche

**Vérifier:**
```sql
SELECT COUNT(*)
FROM users
WHERE role = 'teacher'
AND profile_completed = true
AND is_available = true;
```

Si 0, aucun profil n'est complété.

---

## ✅ Checklist Post-Installation

- [ ] Script SQL exécuté
- [ ] Colonnes créées dans `users`
- [ ] Tables `teacher_reviews` et `teacher_availability` créées
- [ ] Page de complétion accessible
- [ ] Wizard en 4 étapes fonctionne
- [ ] Sauvegarde du profil réussie
- [ ] Page de recherche accessible
- [ ] Filtres fonctionnels
- [ ] Profil public visible

---

## 📞 Commandes Utiles

```sql
-- Voir tous les profs avec profil complet
SELECT display_name, city, hourly_rate, rating, profile_completed
FROM users
WHERE role = 'teacher'
ORDER BY profile_completed DESC, rating DESC;

-- Stats globales
SELECT
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE profile_completed = true) as complets,
  AVG(hourly_rate) as tarif_moyen,
  AVG(rating) FILTER (WHERE total_reviews > 0) as note_moyenne
FROM users
WHERE role = 'teacher';

-- Compléter manuellement un profil pour test
UPDATE users
SET
  phone = '06 12 34 56 78',
  city = 'Paris',
  bio = 'Professeur expérimenté',
  experience = '5-10 ans',
  subjects = ARRAY['Mathématiques'],
  levels = ARRAY['Terminale'],
  teaching_mode = ARRAY['online'],
  hourly_rate = 30.00,
  is_available = true
WHERE id = 'votre-id';
```

---

## 🎉 C'est Tout !

Le système est prêt à être utilisé !

**Prochaines étapes:**
1. Créer quelques profils professeurs de test
2. Tester la recherche côté étudiant
3. Vérifier les filtres
4. Implémenter le système de contact/messagerie
5. Ajouter le calendrier de réservation

**Guide complet:** Voir `TEACHER-PROFILE-SYSTEM-GUIDE.md`

**Bon enseignement ! 🎓✨**
