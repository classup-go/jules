# Guide Complet : Système de Devoirs et Notifications

## 📋 Vue d'ensemble

Ce guide explique comment utiliser le système de devoirs et notifications dans Jules Class Go.

### ✅ Fonctionnalités implémentées

#### 1. Système de Devoirs
- ✅ Création de devoirs par les enseignants
- ✅ Soumission par les étudiants (texte + fichiers)
- ✅ Interface de notation avec rubrique
- ✅ Feedback avec fichiers de correction
- ✅ Gestion des tentatives multiples
- ✅ Détection automatique des retards
- ✅ Statistiques complètes

#### 2. Système de Notifications
- ✅ Notifications en temps réel
- ✅ Badge de compteur non-lu
- ✅ Centre de notifications avec dropdown
- ✅ Notifications automatiques pour :
  - Nouveau devoir publié
  - Soumission reçue (pour enseignant)
  - Devoir noté (pour étudiant)
  - Devoir à rendre bientôt (24h avant)

#### 3. Dashboards Mis à Jour
- ✅ Dashboard professeur avec section devoirs
- ✅ Liste des soumissions à noter
- ✅ Dashboard étudiant avec devoirs à rendre
- ✅ Indicateurs visuels (urgent, en retard, noté)

---

## 🚀 Installation

### Étape 1 : Exécuter les scripts SQL

#### 1.1 Système de Devoirs
```bash
# Dans Supabase SQL Editor, exécutez :
```
📄 Fichier : `supabase-homework-setup.sql`

Cela crée :
- Table `assignments` (devoirs)
- Table `submissions` (soumissions)
- Table `submission_comments` (commentaires)
- Table `assignment_rubrics` (rubrique de notation)
- Table `rubric_grades` (notes par critère)
- Triggers automatiques pour calculs
- RLS policies

#### 1.2 Système de Notifications
```bash
# Dans Supabase SQL Editor, exécutez :
```
📄 Fichier : `supabase-notifications-setup.sql`

Cela crée :
- Table `notifications`
- Fonctions de création de notifications
- Triggers automatiques pour :
  - Devoir publié → notifier étudiants
  - Soumission reçue → notifier enseignant
  - Devoir noté → notifier étudiant
- Fonction pour notifications "à rendre bientôt"

#### 1.3 Buckets de Stockage
```bash
# Dans Supabase SQL Editor, exécutez :
```
📄 Fichier : `supabase-create-buckets.sql`

Cela crée :
- Bucket `homework-files` (privé, 50MB max)
- Bucket `videos-private` (privé, 500MB max)
- Bucket `video-thumbnails` (public)
- Policies d'accès

### Étape 2 : Vérifier l'installation

1. **Vérifier les tables** (Supabase Dashboard → Table Editor)
   - `assignments`
   - `submissions`
   - `notifications`

2. **Vérifier les buckets** (Supabase Dashboard → Storage)
   - `homework-files`
   - `videos-private`

3. **Démarrer le serveur de développement**
```bash
npm run dev
```

---

## 📚 Utilisation

### Pour les Enseignants

#### 1. Créer un Devoir

**URL :** `/teacher/assignments/new?classroom=CLASSROOM_ID`

1. Remplir le formulaire :
   - Titre et description
   - Instructions détaillées
   - Type (texte, fichiers, mixte)
   - Points maximum
   - Note de passage (%)
   - Date limite
   - Soumissions tardives (autorisées ou non)
   - Re-soumissions (autorisées ou non, max tentatives)

2. Cliquer sur "Publier"

**Résultat automatique :**
- Tous les étudiants inscrits à la classe reçoivent une notification
- Le devoir apparaît dans leur dashboard

#### 2. Voir les Soumissions

**URL :** `/teacher/assignments/ASSIGNMENT_ID/submissions`

Affiche :
- Statistiques (total, notés, en retard, moyenne)
- Filtres (Tous, À noter, Notés, En retard)
- Liste des soumissions avec :
  - Nom de l'étudiant
  - Date de soumission
  - Statut
  - Note (si notée)

#### 3. Noter un Devoir

**URL :** `/teacher/submissions/SUBMISSION_ID/grade`

Interface de notation :
- **Colonne gauche :** Travail de l'étudiant
  - Texte soumis
  - Fichiers joints (téléchargeables)
- **Colonne droite :** Formulaire de notation
  - Note sur max_points
  - Calcul automatique du %
  - Indicateur Pass/Fail
  - Zone de feedback
  - Upload de fichiers de correction

**Résultat automatique :**
- L'étudiant reçoit une notification
- La note apparaît dans son dashboard

#### 4. Dashboard Professeur

**URL :** `/teacher/dashboard`

Affiche :
- **Statistiques devoirs :**
  - Nombre de devoirs publiés
  - Nombre de soumissions à noter
  - Nombre de classes actives

- **Soumissions à noter :**
  - Liste des 3 prochaines à noter
  - Lien rapide vers l'interface de notation

- **Notifications :**
  - Icône de cloche en haut à droite
  - Badge avec nombre de non-lus
  - Dropdown avec liste complète

### Pour les Étudiants

#### 1. Voir les Devoirs

**URL :** `/student/assignments?classroom=CLASSROOM_ID`

Affiche :
- Filtres (Tous, À faire, Soumis, Notés)
- Cartes de devoirs avec :
  - Titre et description
  - Date limite
  - Temps restant
  - Statut (À faire, Soumis, Noté)
  - Points

#### 2. Soumettre un Devoir

**URL :** `/student/assignments/ASSIGNMENT_ID/submit`

Formulaire de soumission :
- **Type texte :** Zone de texte pour la réponse
- **Type fichier :** Upload de fichiers (max 5, 50MB chacun)
- **Type mixte :** Les deux

Validations automatiques :
- Vérification de la date limite
- Alerte si soumission tardive
- Vérification du nombre de tentatives
- Confirmation avant soumission

**Résultat automatique :**
- L'enseignant reçoit une notification
- Le devoir apparaît comme "Soumis" dans le dashboard étudiant

#### 3. Voir sa Note

**URL :** `/student/submissions/SUBMISSION_ID`

Affiche :
- **Note grande et colorée**
  - Vert si réussi
  - Rouge si échoué
  - Pourcentage calculé

- **Feedback de l'enseignant**
  - Texte de feedback
  - Fichiers de correction (téléchargeables)

- **Son travail soumis**
  - Révision de ce qui a été soumis

- **Option de re-soumission** (si autorisée)
  - Nombre de tentatives restantes
  - Bouton pour re-soumettre

#### 4. Dashboard Étudiant

**URL :** `/student/dashboard`

Affiche :
- **Section "Devoirs à rendre" :**
  - 3 devoirs les plus urgents
  - Indicateurs visuels :
    - 🔴 Fond jaune = à rendre aujourd'hui/demain
    - ⚠️ Rouge = en retard
    - ✅ Vert = noté

- **Accès rapide "Mes devoirs"**
  - Dans la colonne de droite

- **Notifications :**
  - Icône de cloche en haut à droite
  - Badge avec nombre de non-lus
  - Dropdown avec liste complète

---

## 🔔 Système de Notifications

### Types de Notifications

| Type | Déclencheur | Destinataire | Priorité |
|------|-------------|--------------|----------|
| `assignment_created` | Devoir publié | Étudiants | Normal |
| `submission_received` | Soumission reçue | Enseignant | Normal |
| `assignment_graded` | Devoir noté | Étudiant | Normal/High* |
| `assignment_due_soon` | 24h avant deadline | Étudiants | High |

*High si échoué, Normal si réussi

### Notification Bell Component

Le composant `NotificationBell` peut être ajouté à n'importe quelle page :

```tsx
import NotificationBell from '@/components/notifications/notification-bell';

// Dans votre layout ou header
<NotificationBell />
```

**Features :**
- Auto-refresh toutes les 30 secondes
- Badge de compteur non-lu
- Dropdown avec liste complète
- Click sur notification → marque comme lu
- Liens directs vers les actions
- Suppression individuelle
- Marquer tout comme lu

### API Endpoints

#### GET `/api/notifications`
Récupère les notifications de l'utilisateur

**Query params :**
- `limit` : Nombre de notifications (défaut: 20)
- `unread` : true pour uniquement non-lues
- `type` : Filtrer par type

**Response :**
```json
{
  "notifications": [...],
  "unreadCount": 5
}
```

#### PATCH `/api/notifications/[id]`
Marquer une notification comme lue

#### POST `/api/notifications/mark-all-read`
Marquer toutes comme lues

#### DELETE `/api/notifications/[id]`
Supprimer une notification

---

## 🎨 Intégration dans un Layout

Pour ajouter le NotificationBell dans votre layout global :

```tsx
// src/app/(dashboard)/layout.tsx
import NotificationBell from '@/components/notifications/notification-bell';

export default function DashboardLayout({ children }) {
  return (
    <div>
      <header>
        <nav>
          {/* Votre navigation */}
          <NotificationBell />
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

---

## 🔧 Configuration Avancée

### Notifications "À Rendre Bientôt"

Pour activer les notifications automatiques 24h avant la deadline :

#### Option 1 : Cron Job manuel (Recommandé)

Créez un cron job externe qui appelle :

```bash
# Toutes les heures
curl -X POST https://votre-domaine.com/api/cron/notify-due-soon
```

Créez l'endpoint :

```typescript
// src/app/api/cron/notify-due-soon/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // Vérifier le secret pour sécuriser l'endpoint
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();

  // Appeler la fonction SQL
  const { data, error } = await supabase.rpc('notify_assignments_due_soon');

  if (error) throw error;

  return NextResponse.json({ notificationsSent: data });
}
```

#### Option 2 : Supabase Cron (Si disponible)

```sql
-- Dans Supabase SQL Editor
SELECT cron.schedule(
  'notify-assignments-due',
  '0 * * * *', -- Toutes les heures
  'SELECT notify_assignments_due_soon()'
);
```

---

## 📊 Tests

### Scénario de Test Complet

#### 1. En tant qu'Enseignant

1. **Créer une classe**
   - Aller sur `/teacher/classrooms/new`
   - Créer une classe de test

2. **Créer un devoir**
   - Aller sur `/teacher/assignments/new?classroom=CLASSROOM_ID`
   - Remplir le formulaire
   - Publier le devoir

3. **Vérifier le dashboard**
   - Aller sur `/teacher/dashboard`
   - Le devoir doit apparaître dans les stats

#### 2. En tant qu'Étudiant (compte différent)

1. **S'inscrire à la classe**
   - Utiliser le code d'inscription de la classe

2. **Vérifier les notifications**
   - Cliquer sur l'icône de cloche
   - Une notification "Nouveau devoir disponible" doit apparaître

3. **Voir le devoir dans le dashboard**
   - Aller sur `/student/dashboard`
   - Le devoir doit apparaître dans "Devoirs à rendre"

4. **Soumettre le devoir**
   - Cliquer sur le devoir
   - Remplir et soumettre

5. **Vérifier la notification de l'enseignant**
   - Se reconnecter en tant qu'enseignant
   - Une notification "Nouvelle soumission reçue" doit apparaître

#### 3. Notation (En tant qu'Enseignant)

1. **Aller sur le dashboard**
   - La soumission doit apparaître dans "À noter"

2. **Noter le devoir**
   - Cliquer sur "Noter"
   - Entrer une note
   - Ajouter du feedback
   - Enregistrer

3. **Vérifier la notification de l'étudiant**
   - Se reconnecter en tant qu'étudiant
   - Une notification "Devoir noté" doit apparaître

4. **Voir la note**
   - Le devoir doit apparaître comme "Noté" dans le dashboard
   - Cliquer dessus pour voir la note et le feedback

---

## 🐛 Dépannage

### Problème : Les notifications n'apparaissent pas

**Solution :**
1. Vérifier que le script SQL des notifications a été exécuté
2. Vérifier les triggers dans Supabase Dashboard → Database → Triggers
3. Vérifier les RLS policies sur la table `notifications`

### Problème : Impossible de télécharger des fichiers

**Solution :**
1. Vérifier que les buckets existent (Supabase Dashboard → Storage)
2. Vérifier les policies sur les buckets
3. Vérifier la taille des fichiers (max 50MB pour homework-files)

### Problème : Les soumissions n'apparaissent pas

**Solution :**
1. Vérifier que l'étudiant est bien inscrit à la classe
2. Vérifier le statut d'enrollment (`status = 'active'`)
3. Vérifier que le devoir est publié (`status = 'published'`)

---

## 📁 Structure des Fichiers

```
src/
├── app/
│   ├── api/
│   │   ├── assignments/
│   │   │   ├── route.ts               # GET/POST assignments
│   │   │   └── [id]/
│   │   │       └── route.ts           # GET/PUT/DELETE assignment
│   │   ├── submissions/
│   │   │   ├── route.ts               # GET/POST submissions
│   │   │   └── [id]/
│   │   │       └── grade/
│   │   │           └── route.ts       # POST grade submission
│   │   └── notifications/
│   │       ├── route.ts               # GET/POST/DELETE notifications
│   │       ├── [id]/
│   │       │   └── route.ts           # PATCH/DELETE notification
│   │       └── mark-all-read/
│   │           └── route.ts           # POST mark all read
│   └── (dashboard)/
│       ├── teacher/
│       │   ├── dashboard/
│       │   │   └── page.tsx           # Dashboard professeur ✨ MAJ
│       │   ├── assignments/
│       │   │   ├── page.tsx           # Liste des devoirs
│       │   │   ├── new/
│       │   │   │   └── page.tsx       # Créer un devoir
│       │   │   └── [id]/
│       │   │       └── submissions/
│       │   │           └── page.tsx   # Liste des soumissions
│       │   └── submissions/
│       │       └── [id]/
│       │           └── grade/
│       │               └── page.tsx   # Interface de notation
│       └── student/
│           ├── dashboard/
│           │   └── page.tsx           # Dashboard étudiant ✨ MAJ
│           ├── assignments/
│           │   ├── page.tsx           # Liste des devoirs
│           │   └── [id]/
│           │       └── submit/
│           │           └── page.tsx   # Soumettre un devoir
│           └── submissions/
│               └── [id]/
│                   └── page.tsx       # Voir sa note
├── components/
│   ├── homework/
│   │   └── homework-file-upload.tsx  # Upload de fichiers
│   └── notifications/
│       └── notification-bell.tsx     # ✨ NOUVEAU composant
└── lib/
    └── supabase/
        ├── client.ts
        └── server.ts

Fichiers SQL:
├── supabase-homework-setup.sql       # Schema devoirs
├── supabase-notifications-setup.sql  # ✨ NOUVEAU Schema notifications
└── supabase-create-buckets.sql       # Buckets de stockage
```

---

## 🎯 Prochaines Étapes (Optionnel)

### Améliorations Possibles

1. **Email de notifications**
   - Intégrer Resend ou SendGrid
   - Envoyer un email pour les notifications importantes

2. **Notifications push**
   - Utiliser Firebase Cloud Messaging
   - Notifications sur mobile

3. **Rubrique de notation avancée**
   - Utiliser la table `assignment_rubrics`
   - Interface de notation par critères

4. **Statistiques avancées**
   - Graphiques de progression
   - Analyse de performance par classe

5. **Mode hors ligne**
   - PWA avec Service Worker
   - Synchronisation des données

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifier ce guide de dépannage
2. Vérifier les logs dans la console du navigateur
3. Vérifier les logs Supabase Dashboard → Logs
4. Créer une issue sur GitHub avec :
   - Description du problème
   - Étapes pour reproduire
   - Captures d'écran
   - Messages d'erreur

---

## ✅ Checklist de Déploiement

Avant de déployer en production :

- [ ] Exécuter tous les scripts SQL en production
- [ ] Vérifier les buckets de storage
- [ ] Tester la création de devoirs
- [ ] Tester la soumission
- [ ] Tester la notation
- [ ] Tester les notifications
- [ ] Vérifier les permissions RLS
- [ ] Configurer le cron job pour "à rendre bientôt"
- [ ] Tester sur mobile
- [ ] Vérifier les performances

---

**✨ Système complet prêt à l'emploi !**
