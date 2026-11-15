# 🏗️ ARCHITECTURE CLARIFIÉE - 2026-01-24

**Date**: 2026-01-24
**Version**: 2.0
**Statut**: Architecture finale validée

---

## 🎯 CONCEPTS CLÉS

### 1. CLASSE (Classroom)
**Rôle** : Conteneur de gestion (CRUD uniquement)

Une classe contient :
- ✅ Cours (courses)
- ✅ Examens (exams)
- ✅ Sessions live (live_sessions)

**Important** : Les étudiants **n'achètent PAS** la classe. Ils achètent un **cours individuel**.

### 2. COURS (Course)
**Rôle** : Unité achetable individuelle

- Un étudiant achète **UN cours**
- Prix individuel par cours (ex: 20€, 25€)
- Inscription au cours → inscription automatique à la classe parente
- Chaque cours appartient à une classe

### 3. SESSION LIVE (Live Session)
**Rôle** : Cours en temps réel planifié

- Planifiée par le professeur dans une classe
- Prix fixé par session (peut être différent des cours)
- Étudiants inscrits au cours parent sont notifiés
- Visible dans le catalogue comme un cours (format "session live")
- Utilise LiveKit pour la vidéo

**Flow** :
```
Professeur planifie session live
   ↓
Fixe le prix
   ↓
Système notifie les étudiants inscrits au cours
   ↓
Session apparaît dans le catalogue (badge "LIVE")
   ↓
Étudiants peuvent acheter/rejoindre
```

### 4. EXAMEN (Exam)
**Rôle** : Évaluation dans une classe

- Créé par le professeur
- Lié à un cours ou une classe
- Visible uniquement pour les étudiants inscrits

---

## 💰 DEVISE & PAIEMENT

### Devise de base
- **EUR** (Euro)
- Tous les prix sont stockés en EUR dans la base de données
- Conversion vers devises locales à l'affichage

### Paiement par défaut
- **Stripe** (par défaut)
- Modifiable depuis les paramètres du profil

### Devises supportées
- EUR (Euro) - Base
- TND (Dinar tunisien)
- XOF (Franc CFA Ouest)
- XAF (Franc CFA Central)
- MAD (Dirham marocain)
- DZD (Dinar algérien)
- USD (Dollar américain)

### Détection automatique
- ❌ **DÉSACTIVÉE** (bloquée)
- L'utilisateur doit choisir manuellement sa devise
- Choix effectué dans "Complete Profile" ou "Paramètres"

---

## 👤 COMPLETE PROFILE (Étudiants)

### Page obligatoire après inscription

**Données collectées** :
1. **Pays** (sélection parmi liste)
2. **Adresse complète**
3. **Numéro de téléphone**
4. **Devise préférée** (EUR, TND, XOF, etc.)
5. **Niveau scolaire** :
   - Collège
   - Lycée
   - Terminal
   - Bac (type de bac)
   - Universitaire
   - Autre

**Utilité** :
- Affiner les résultats de recherche
- Recommander des cours adaptés au niveau
- Afficher les prix dans la devise choisie
- Faciliter le paiement (adresse pré-remplie)

**Route** : `/complete-profile`

---

## 🗄️ STRUCTURE BASE DE DONNÉES

### Table : `users`
```sql
- id (uuid, pk)
- email
- display_name
- role (student | teacher | admin)
- country (text) ← NOUVEAU
- address (text) ← NOUVEAU
- phone (text) ← NOUVEAU
- currency (text) ← NOUVEAU (EUR, TND, XOF, etc.)
- education_level (text) ← NOUVEAU (college, lycee, terminal, bac, university)
- bac_type (text) ← NOUVEAU (scientifique, littéraire, etc.)
- profile_completed (boolean) ← NOUVEAU
- created_at
- updated_at
```

### Table : `classrooms`
```sql
- id (uuid, pk)
- teacher_id (uuid, fk → users)
- title
- subject
- level
- description
- is_public (boolean)
- created_at
- updated_at

-- Note: Plus de "enrolled_count" au niveau classe
-- Car on compte au niveau cours
```

### Table : `courses`
```sql
- id (uuid, pk)
- classroom_id (uuid, fk → classrooms) ← Classe parente
- teacher_id (uuid, fk → users)
- title
- description
- price (decimal) ← Prix en EUR
- access_type ('free' | 'premium')
- enrolled_count (integer) ← Compteur d'inscrits à CE cours
- learning_objectives (text[])
- prerequisites (text[])
- settings (jsonb)
- is_published (boolean)
- created_at
- updated_at
```

### Table : `live_sessions` ← NOUVELLE
```sql
- id (uuid, pk)
- classroom_id (uuid, fk → classrooms)
- course_id (uuid, fk → courses) ← Session liée à un cours
- teacher_id (uuid, fk → users)
- title
- description
- scheduled_at (timestamp) ← Date/heure planifiée
- duration_minutes (integer) ← Durée prévue
- price (decimal) ← Prix en EUR (peut être différent du cours)
- room_id (text) ← LiveKit room ID
- status ('scheduled' | 'live' | 'ended' | 'cancelled')
- max_participants (integer)
- enrolled_count (integer)
- is_public (boolean) ← Visible dans le catalogue
- created_at
- updated_at
```

### Table : `enrollments`
```sql
- id (uuid, pk)
- student_id (uuid, fk → users)
- classroom_id (uuid, fk → classrooms) ← Classe parente
- course_id (uuid, fk → courses) ← Cours acheté
- payment_id (uuid, fk → transactions)
- status ('active' | 'cancelled' | 'expired')
- progress (integer, 0-100)
- payment_required (boolean)
- payment_completed_at (timestamp)
- created_at
- updated_at

-- Note: course_id est TOUJOURS rempli
-- L'inscription à un cours = inscription automatique à la classe
```

### Table : `live_session_enrollments` ← NOUVELLE
```sql
- id (uuid, pk)
- student_id (uuid, fk → users)
- live_session_id (uuid, fk → live_sessions)
- payment_id (uuid, fk → transactions)
- status ('registered' | 'attended' | 'missed' | 'cancelled')
- joined_at (timestamp)
- left_at (timestamp)
- created_at
```

### Table : `transactions`
```sql
- id (uuid, pk)
- student_id (uuid, fk → users)
- teacher_id (uuid, fk → users)
- amount_eur (decimal) ← Montant en EUR
- amount_local (decimal) ← Montant en devise locale
- currency (text) ← Devise utilisée
- status ('pending' | 'completed' | 'failed' | 'refunded')
- payment_provider ('stripe' | 'paypal' | 'other')
- stripe_payment_id (text)
- metadata (jsonb) ← { course_id, classroom_id, live_session_id }
- created_at
- updated_at
```

### Table : `exams` ← NOUVELLE
```sql
- id (uuid, pk)
- classroom_id (uuid, fk → classrooms)
- course_id (uuid, fk → courses)
- teacher_id (uuid, fk → users)
- title
- description
- duration_minutes (integer)
- total_points (integer)
- passing_score (integer)
- scheduled_at (timestamp)
- deadline (timestamp)
- status ('draft' | 'published' | 'closed')
- created_at
- updated_at
```

---

## 🔄 FLOWS PRINCIPAUX

### Flow 1 : Inscription Étudiant

```
1. Étudiant crée un compte (email/password)
   ↓
2. Redirection vers /complete-profile
   ↓
3. Remplit :
   - Pays, Adresse, Téléphone
   - Devise préférée
   - Niveau scolaire (terminal, bac, etc.)
   ↓
4. Sauvegarde dans users table
   ↓
5. profile_completed = true
   ↓
6. Redirection vers /dashboard
```

### Flow 2 : Création de Classe (Professeur)

```
1. Professeur va dans /teacher/classrooms/new
   ↓
2. Remplit :
   - Titre de la classe
   - Matière, Niveau
   - Description
   ↓
3. Classe créée (conteneur vide)
   ↓
4. Redirection vers /teacher/classrooms/[id]
   ↓
5. Professeur peut maintenant :
   - Créer des cours
   - Créer des examens
   - Planifier des sessions live
```

### Flow 3 : Création de Cours (Professeur)

```
1. Professeur va dans /teacher/classrooms/[id]
   ↓
2. Clique "Ajouter un cours"
   ↓
3. Remplit :
   - Titre du cours
   - Description
   - Prix (en EUR ou devise locale, converti automatiquement)
   - Objectifs pédagogiques
   - Prérequis
   ↓
4. Cours créé dans la classe
   ↓
5. Cours visible dans /classroom/[id] (page publique)
```

### Flow 4 : Achat d'un Cours (Étudiant)

```
1. Étudiant navigue dans /search ou /classroom/[id]
   ↓
2. Voit les cours avec leurs prix (dans sa devise)
   ↓
3. Clique "Acheter ce cours - 20€"
   ↓
4. Redirect vers /checkout?course=ID
   ↓
5. Récapitulatif du cours + prix
   ↓
6. Clique "Confirmer inscription"
   ↓
7. API /api/checkout crée Stripe session
   ↓
8. Redirect vers Stripe Checkout
   ↓
9. Étudiant entre sa carte
   ↓
10. Paiement traité
   ↓
11. Webhook Stripe → /api/webhook/stripe
   ↓
12. Création de :
    - Transaction (table transactions)
    - Enrollment avec course_id ET classroom_id
   ↓
13. Redirect vers /payment/success
   ↓
14. Étudiant peut accéder au cours : /course/[id]
```

### Flow 5 : Planification Session Live (Professeur)

```
1. Professeur va dans /teacher/classrooms/[id]
   ↓
2. Clique "Planifier une session live"
   ↓
3. Remplit :
   - Titre de la session
   - Description
   - Date/heure (scheduled_at)
   - Durée (duration_minutes)
   - Prix (peut être différent du cours)
   - Cours parent (optionnel)
   - Public ou privé
   ↓
4. Session créée dans live_sessions
   ↓
5. Si cours parent spécifié :
   - Système récupère les étudiants inscrits au cours
   - Création de notifications pour chaque étudiant
   ↓
6. Session visible dans /search (badge "LIVE")
   ↓
7. Étudiants peuvent :
   - Acheter la session (si payante)
   - Rejoindre la session (si inscrits au cours)
```

### Flow 6 : Participation Session Live (Étudiant)

```
1. Étudiant clique sur session live dans /search
   ↓
2. Si payante ET non inscrit :
   - Redirect vers /checkout?live_session=ID
   - Flow de paiement similaire à Flow 4
   ↓
3. Si inscrit au cours parent :
   - Accès gratuit ou réduit (selon config)
   ↓
4. À l'heure prévue :
   - Bouton "Rejoindre" devient actif
   - Clique "Rejoindre la session"
   ↓
5. Redirect vers /live/[session_id]
   ↓
6. Interface LiveKit :
   - Vidéo professeur
   - Chat en direct
   - Partage d'écran
   - Tableau blanc (optionnel)
   ↓
7. Enregistrement de :
   - joined_at (timestamp)
   - left_at (timestamp)
   - status = 'attended'
```

---

## 🔍 RECHERCHE & CATALOGUE

### Filtres disponibles

**Par niveau scolaire** (utilise users.education_level) :
- Collège
- Lycée
- Terminal
- Bac
- Universitaire

**Par matière** :
- Mathématiques
- Physique-Chimie
- SVT
- Histoire-Géo
- etc.

**Par type** :
- Cours standard
- Session live (badge "LIVE")
- Gratuit / Payant

**Par prix** (dans la devise de l'étudiant) :
- Gratuit
- 0-20€
- 20-50€
- 50-100€
- 100€+

**Tri** :
- Plus récents
- Plus populaires (enrolled_count)
- Prix croissant/décroissant
- Sessions live à venir

---

## 🎨 COMPOSANTS UI

### Badge "LIVE"
```tsx
// Pour les sessions live dans le catalogue
{item.type === 'live_session' && (
  <span className="badge badge-live">
    🔴 LIVE - {formattedDate}
  </span>
)}
```

### Card Cours
```tsx
<div className="course-card">
  <img src={course.image_url} />
  <h3>{course.title}</h3>
  <p>{course.description}</p>
  <div className="course-meta">
    <span>{course.enrolled_count} inscrits</span>
    <span>{formattedPrice}</span>
  </div>
  <button>Acheter ce cours</button>
</div>
```

### Card Session Live
```tsx
<div className="course-card live-session">
  <span className="badge-live">🔴 LIVE</span>
  <img src={session.image_url} />
  <h3>{session.title}</h3>
  <p>{session.description}</p>
  <div className="session-meta">
    <span>📅 {formattedDate}</span>
    <span>⏱️ {session.duration_minutes} min</span>
    <span>{session.enrolled_count}/{session.max_participants} places</span>
    <span>{formattedPrice}</span>
  </div>
  <button>Réserver cette session</button>
</div>
```

---

## 📝 MIGRATIONS À CRÉER

### Migration 007 : Complete Profile
```sql
-- Ajout des champs pour le profil complet
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS education_level TEXT,
  ADD COLUMN IF NOT EXISTS bac_type TEXT,
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;
```

### Migration 008 : Live Sessions
```sql
-- Création de la table live_sessions
CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price DECIMAL(10, 2) DEFAULT 0,
  room_id TEXT,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  max_participants INTEGER,
  enrolled_count INTEGER DEFAULT 0,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des inscriptions aux sessions live
CREATE TABLE IF NOT EXISTS live_session_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  live_session_id UUID REFERENCES live_sessions(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'missed', 'cancelled')),
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, live_session_id)
);

-- Index pour performance
CREATE INDEX idx_live_sessions_scheduled_at ON live_sessions(scheduled_at);
CREATE INDEX idx_live_sessions_status ON live_sessions(status);
CREATE INDEX idx_live_session_enrollments_student ON live_session_enrollments(student_id);
CREATE INDEX idx_live_session_enrollments_session ON live_session_enrollments(live_session_id);
```

### Migration 009 : Exams
```sql
-- Création de la table exams
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 100,
  passing_score INTEGER NOT NULL DEFAULT 50,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_exams_classroom ON exams(classroom_id);
CREATE INDEX idx_exams_course ON exams(course_id);
CREATE INDEX idx_exams_status ON exams(status);
```

---

## 🚀 IMPLÉMENTATION PAR PHASES

### Phase 1 : Fix Système Actuel (URGENT)
- [x] Fix RLS policies
- [x] Fix paiement par cours
- [x] Fix devise dynamique
- [ ] Exécuter FIX-RLS-POLICIES-FINAL.sql
- [ ] Tester le flow complet

### Phase 2 : Complete Profile (PRIORITAIRE)
- [ ] Créer migration 007
- [ ] Créer page /complete-profile
- [ ] Middleware pour rediriger si profil incomplet
- [ ] Bloquer détection automatique de devise

### Phase 3 : Sessions Live (NOUVELLE FONCTIONNALITÉ)
- [ ] Créer migration 008
- [ ] Créer page /teacher/live-sessions/new
- [ ] Créer page /live/[session_id] (LiveKit)
- [ ] Intégrer dans le catalogue avec badge "LIVE"
- [ ] Système de notifications pour étudiants

### Phase 4 : Examens (NOUVELLE FONCTIONNALITÉ)
- [ ] Créer migration 009
- [ ] Créer page /teacher/exams/new
- [ ] Créer page /exam/[id] (interface étudiant)
- [ ] Système de correction automatique
- [ ] Génération de notes

### Phase 5 : Recherche Avancée
- [ ] Filtres par niveau scolaire
- [ ] Filtres par type (cours, live, gratuit)
- [ ] Recommandations basées sur profil
- [ ] Algorithme de scoring

---

## 📞 NOTES IMPORTANTES

### Devise
- **Base** : EUR
- **Pas de détection automatique**
- L'utilisateur DOIT choisir sa devise dans "Complete Profile"

### Paiement
- **Stripe par défaut**
- Modifiable depuis paramètres (futur : PayPal, Orange Money, etc.)

### Inscription
- **1 cours acheté = 1 enrollment avec course_id + classroom_id**
- Pas d'inscription à la classe seule
- La classe est un conteneur de gestion uniquement

### Sessions Live
- Visible dans le catalogue comme un cours
- Badge "LIVE" + date/heure
- Prix peut être différent du cours parent
- Étudiants inscrits au cours notifiés automatiquement

---

*Architecture validée - 2026-01-24*
