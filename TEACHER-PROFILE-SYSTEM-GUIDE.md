# 🎓 Guide Complet - Système de Mise en Relation Professeur-Étudiant

## 📋 Vue d'Ensemble

Le système de mise en relation Jules Class Go permet aux **professeurs** de créer des profils complets et aux **étudiants** de trouver le professeur idéal selon leurs besoins.

### ✨ Fonctionnalités Principales

**Pour les Professeurs:**
- ✅ Profil complet avec toutes les informations essentielles
- ✅ Gestion des matières et niveaux enseignés
- ✅ Modes d'enseignement (en ligne, présentiel, à domicile)
- ✅ Tarification flexible
- ✅ Spécialités et certifications
- ✅ Système d'avis et notes
- ✅ Indicateur de complétion du profil

**Pour les Étudiants:**
- ✅ Recherche avancée avec filtres multiples
- ✅ Vue détaillée des profils professeurs
- ✅ Consultation des avis et notes
- ✅ Contact direct avec les professeurs
- ✅ Visualisation des disponibilités

---

## 🗂️ Fichiers Créés

### 1. Script SQL
**`supabase-teacher-profile-enhancement.sql`**
- Ajout de colonnes au profil professeur
- Création de la table `teacher_reviews` (avis)
- Création de la table `teacher_availability` (disponibilités)
- Fonctions automatiques pour calcul de note
- Triggers pour complétion du profil
- Vue `public_teacher_profiles`
- Fonction de recherche `search_teachers()`

### 2. Types TypeScript
**`src/types/teacher-profile.ts`**
- Types complets pour le profil professeur
- Interfaces pour avis et disponibilités
- Helpers (listes de matières, niveaux, etc.)

### 3. Pages Interface

#### **`src/app/(dashboard)/teacher/profile/complete/page.tsx`**
**Wizard de Complétion du Profil Professeur**
- 4 étapes guidées
- Validation complète
- Indicateur de progression
- Interface intuitive

#### **`src/app/(dashboard)/find-teachers/page.tsx`**
**Page de Recherche de Professeurs**
- Filtres avancés
- Affichage en grille
- Recherche par ville
- Tri par note/tarif

#### **`src/app/(dashboard)/teacher/[id]/page.tsx`**
**Profil Public du Professeur**
- Vue complète du profil
- Avis des élèves
- Contact et disponibilités
- Informations détaillées

---

## 🚀 Installation

### Étape 1: Exécuter le Script SQL

Dans Supabase SQL Editor:

```sql
-- Copier et exécuter le contenu de:
supabase-teacher-profile-enhancement.sql
```

Ce script va:
- ✅ Ajouter ~20 colonnes à la table `users`
- ✅ Créer la table `teacher_reviews`
- ✅ Créer la table `teacher_availability`
- ✅ Configurer les indexes de performance
- ✅ Activer RLS sur les nouvelles tables
- ✅ Créer les fonctions automatiques

### Étape 2: Vérifier les Tables

```sql
-- Vérifier les nouvelles colonnes
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('phone', 'city', 'subjects', 'levels', 'teaching_mode', 'hourly_rate');

-- Vérifier les nouvelles tables
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('teacher_reviews', 'teacher_availability');
```

### Étape 3: Tester l'Application

1. Ouvrir http://localhost:3001
2. Se connecter en tant que **professeur**
3. Aller dans **Profil** → **Compléter mon Profil**
4. Remplir les 4 étapes du wizard
5. Vérifier que le profil est complété à 100%

---

## 📊 Structure des Données

### Table `users` (Colonnes Ajoutées)

```sql
-- Coordonnées
phone TEXT                    -- Téléphone
address TEXT                  -- Adresse complète
city TEXT                     -- Ville
postal_code TEXT              -- Code postal

-- Profil Professeur
bio TEXT                      -- Biographie/présentation
experience TEXT               -- Années d'expérience
subjects TEXT[]               -- Matières enseignées
levels TEXT[]                 -- Niveaux enseignés
teaching_mode TEXT[]          -- Modes (online, in_person, at_home)

-- Tarification
hourly_rate DECIMAL(10,2)     -- Prix horaire en €
can_travel BOOLEAN            -- Peut se déplacer
travel_distance INTEGER       -- Distance max en km

-- Qualifications
specialties TEXT[]            -- Spécialités
certifications TEXT[]         -- Diplômes
languages TEXT[]              -- Langues parlées

-- Statistiques
rating DECIMAL(3,2)           -- Note moyenne
total_reviews INTEGER         -- Nombre d'avis
total_students INTEGER        -- Nombre d'élèves
profile_completed BOOLEAN     -- Profil à 100%
verified BOOLEAN              -- Profil vérifié

-- Disponibilité
is_available BOOLEAN          -- Accepte nouveaux élèves
```

### Table `teacher_reviews`

```sql
id UUID PRIMARY KEY
teacher_id UUID              -- Référence au professeur
student_id UUID              -- Référence à l'élève
rating INTEGER               -- Note de 1 à 5
comment TEXT                 -- Commentaire (optionnel)
created_at TIMESTAMP
```

### Table `teacher_availability`

```sql
id UUID PRIMARY KEY
teacher_id UUID              -- Référence au professeur
day_of_week INTEGER          -- 0=Dimanche, 6=Samedi
start_time TIME              -- Heure de début
end_time TIME                -- Heure de fin
is_available BOOLEAN         -- Disponible ce créneau
```

---

## 🎨 Utilisation - Professeur

### Compléter son Profil

**URL:** `/teacher/profile/complete`

#### Étape 1: Informations de Base
- Nom complet *
- Téléphone *
- Ville *
- Code postal
- Adresse complète
- Biographie (500 caractères recommandés) *
- Expérience d'enseignement *

#### Étape 2: Enseignement
- **Matières enseignées** (multi-sélection) *
  - Mathématiques, Français, Anglais, etc.
- **Niveaux enseignés** (multi-sélection) *
  - 6ème à Terminale
  - Licence, Master, Doctorat
  - Adulte, Professionnel
- **Modes d'enseignement** (multi-sélection) *
  - 💻 Cours en ligne
  - 🏫 Cours en présentiel
  - 🏠 Cours à domicile

#### Étape 3: Tarifs & Modalités
- **Tarif horaire** (€) *
- **Peut se déplacer** (checkbox)
- Si oui: **Distance maximale** (km)

#### Étape 4: Qualifications
- **Spécialités** (optionnel)
  - Ex: Préparation Bac, Soutien scolaire
- **Diplômes & Certifications** (optionnel)
  - Ex: Master Mathématiques, CAPES
- **Langues parlées**
  - Français (par défaut)

### Indicateur de Complétion

Le profil est considéré **complet à 100%** quand:
- ✅ Nom renseigné
- ✅ Téléphone renseigné
- ✅ Ville renseignée
- ✅ Bio renseignée
- ✅ Expérience sélectionnée
- ✅ Au moins 1 matière
- ✅ Au moins 1 niveau
- ✅ Au moins 1 mode d'enseignement
- ✅ Tarif horaire > 0
- ✅ Au moins 1 spécialité OU 1 certification

---

## 🔍 Utilisation - Étudiant

### Rechercher un Professeur

**URL:** `/find-teachers`

#### Barre de Recherche
- 🔍 Recherche par ville

#### Filtres Disponibles

1. **Matière**
   - Sélection parmi toutes les matières

2. **Niveau**
   - Sélection parmi tous les niveaux

3. **Mode d'enseignement**
   - En ligne
   - Présentiel
   - À domicile

4. **Tarif maximum** (€/h)
   - Saisie libre

5. **Note minimum**
   - Toutes les notes
   - 3+ étoiles
   - 4+ étoiles
   - 4.5+ étoiles

6. **Peut se déplacer**
   - Checkbox pour filtrer uniquement les profs qui se déplacent

#### Résultats

Affichage en grille avec:
- Photo du professeur
- Nom et ville
- Note et nombre d'avis
- Biographie (2 lignes)
- Matières enseignées (3 premières)
- Modes d'enseignement
- Expérience
- Tarif horaire
- Badge "Vérifié" si applicable

### Voir le Profil Complet

**URL:** `/teacher/[id]`

Cliquer sur une carte professeur pour voir:

#### Sidebar (Gauche)
- Photo
- Nom et ville
- Note moyenne
- Tarif horaire
- Boutons "Contacter" et "Voir disponibilités"
- Informations rapides
  - Expérience
  - Nombre d'élèves
  - Déplacement possible
  - Langues parlées

#### Contenu Principal (Droite)
- **À Propos**
  - Biographie complète

- **Matières Enseignées**
  - Toutes les matières en badges

- **Niveaux Enseignés**
  - Tous les niveaux en badges

- **Modes d'Enseignement**
  - Cartes visuelles pour chaque mode

- **Spécialités**
  - Liste des spécialités

- **Diplômes & Certifications**
  - Liste des diplômes

- **Avis des Élèves**
  - Tous les avis avec notes et commentaires

---

## ⭐ Système d'Avis

### Laisser un Avis (Étudiant)

```typescript
// À implémenter: Formulaire d'avis
const leaveReview = async (teacherId: string, rating: number, comment: string) => {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  await supabase
    .from('teacher_reviews')
    .insert({
      teacher_id: teacherId,
      student_id: user.id,
      rating: rating,
      comment: comment
    });
};
```

### Calcul Automatique de la Note

Grâce au trigger SQL, la note moyenne est **automatiquement mise à jour** à chaque nouvel avis:

```sql
-- Trigger automatique
CREATE TRIGGER trigger_update_teacher_rating
  AFTER INSERT OR UPDATE OR DELETE ON teacher_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_rating();
```

La note est calculée comme:
- **rating** = Moyenne de tous les avis
- **total_reviews** = Nombre total d'avis

---

## 📅 Gestion des Disponibilités

### Table `teacher_availability`

Permet aux professeurs de définir leurs créneaux:

```sql
-- Exemple: Disponible le lundi de 14h à 18h
INSERT INTO teacher_availability (teacher_id, day_of_week, start_time, end_time)
VALUES ('uuid-du-prof', 1, '14:00', '18:00');
```

**Jours de la semaine:**
- 0 = Dimanche
- 1 = Lundi
- 2 = Mardi
- 3 = Mercredi
- 4 = Jeudi
- 5 = Vendredi
- 6 = Samedi

---

## 🔐 Sécurité (RLS)

### Politiques `teacher_reviews`

```sql
-- Tout le monde peut voir les avis
"Anyone can view reviews" - SELECT

-- Les étudiants peuvent créer leurs avis
"Students create reviews" - INSERT
  WITH CHECK (auth.uid() = student_id)

-- Les étudiants peuvent modifier leurs propres avis
"Students update own reviews" - UPDATE
  USING (auth.uid() = student_id)

-- Les étudiants peuvent supprimer leurs propres avis
"Students delete own reviews" - DELETE
  USING (auth.uid() = student_id)
```

### Politiques `teacher_availability`

```sql
-- Tout le monde peut voir les disponibilités
"Anyone can view availability" - SELECT

-- Les professeurs gèrent leurs propres disponibilités
"Teachers manage own availability" - ALL
  USING (teacher_id = auth.uid())
```

---

## 📊 Fonction de Recherche Avancée

La fonction SQL `search_teachers()` permet une recherche optimisée:

```sql
SELECT * FROM search_teachers(
  search_subject := 'Mathématiques',
  search_level := 'Terminale',
  search_city := 'Paris',
  search_mode := 'online',
  min_rating := 4.0,
  max_hourly_rate := 40.0,
  only_can_travel := false
);
```

Tous les paramètres sont optionnels.

---

## 🎯 Critères de Qualité

### Badge "Vérifié" ✓

Un professeur est **vérifié** quand:
- Profil complété à 100%
- Identité vérifiée par admin
- Au moins 5 avis positifs
- Diplômes validés

*À implémenter: Processus de vérification admin*

### Profil Complet ✅

Le système vérifie automatiquement via trigger SQL:
- `profile_completed = true` quand tous les champs requis sont remplis
- Mis à jour à chaque modification du profil

---

## 💡 Conseils pour les Professeurs

### Optimiser son Profil

**Photo de Profil:**
- ✅ Photo professionnelle
- ✅ Visage visible
- ✅ Arrière-plan neutre

**Biographie:**
- ✅ 300-500 caractères
- ✅ Parler de son parcours
- ✅ Expliquer sa pédagogie
- ✅ Mentionner ses résultats

**Matières et Niveaux:**
- ✅ Sélectionner TOUTES les matières que vous enseignez
- ✅ Ne pas se limiter (augmente la visibilité)

**Tarification:**
- ✅ Tarif compétitif (moyenne: 20-40€/h)
- ✅ Réfléchir au déplacement (bonus de visibilité)

**Spécialités:**
- ✅ Ajouter 3-5 spécialités claires
- ✅ Ex: "Préparation Bac S", "Rattrapage scolaire", "Perfectionnement"

---

## 🚧 Fonctionnalités À Venir

### Court Terme
- [ ] Système de messagerie intégré
- [ ] Calendrier de réservation
- [ ] Paiement en ligne sécurisé
- [ ] Notifications en temps réel

### Moyen Terme
- [ ] Visioconférence intégrée
- [ ] Partage de documents
- [ ] Suivi de progression élève
- [ ] Tableau de bord statistiques

### Long Terme
- [ ] Application mobile
- [ ] IA pour matching prof-élève
- [ ] Programme de fidélité
- [ ] Marketplace de cours

---

## 📞 Support

### Commandes Utiles

```sql
-- Voir tous les professeurs avec profil complet
SELECT display_name, city, hourly_rate, rating, profile_completed
FROM users
WHERE role = 'teacher'
ORDER BY profile_completed DESC, rating DESC;

-- Voir les avis d'un professeur
SELECT
  tr.rating,
  tr.comment,
  u.display_name as student_name,
  tr.created_at
FROM teacher_reviews tr
JOIN users u ON u.id = tr.student_id
WHERE tr.teacher_id = 'uuid-du-prof'
ORDER BY tr.created_at DESC;

-- Statistiques globales
SELECT
  COUNT(*) as total_teachers,
  COUNT(*) FILTER (WHERE profile_completed = true) as complete_profiles,
  AVG(hourly_rate) as avg_rate,
  AVG(rating) FILTER (WHERE total_reviews > 0) as avg_rating
FROM users
WHERE role = 'teacher';
```

---

## ✅ Checklist de Vérification

### Installation
- [ ] Script SQL exécuté sans erreur
- [ ] Colonnes ajoutées à `users`
- [ ] Tables `teacher_reviews` et `teacher_availability` créées
- [ ] Indexes créés
- [ ] RLS activé

### Test Professeur
- [ ] Page de complétion accessible
- [ ] Wizard en 4 étapes fonctionne
- [ ] Sauvegarde du profil réussie
- [ ] Indicateur de complétion à 100%

### Test Étudiant
- [ ] Page de recherche accessible
- [ ] Filtres fonctionnels
- [ ] Résultats affichés correctement
- [ ] Profil public accessible
- [ ] Bouton "Contacter" présent

---

## 🎉 Conclusion

Le système de mise en relation professeur-étudiant est maintenant **opérationnel** !

**Prochaines étapes:**
1. Exécuter le script SQL
2. Tester la complétion de profil professeur
3. Tester la recherche côté étudiant
4. Implémenter le système de messagerie
5. Ajouter le calendrier de réservation

**Bon enseignement ! 🎓✨**
