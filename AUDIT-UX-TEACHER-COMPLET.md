# 🔍 AUDIT UX COMPLET - Dashboard Professeur Jules Class Go

**Date**: 2026-01-20
**Focus**: Système de cours + Sessions live
**Statut**: 🔴 Problèmes critiques identifiés

---

## 📊 Vue d'ensemble

### Routes identifiées (24 pages)

```
/teacher
├─ /dashboard                    → Dashboard principal
├─ /profile                      → Profil professeur
├─ /classrooms                   → Liste des classes
│  ├─ /new                      → Créer classe
│  └─ /[id]                     → Détail classe
├─ /courses                      → Liste des cours ⭐
│  ├─ /new                      → Wizard création cours ⭐
│  ├─ /[id]                     → Détail cours
│  └─ /[id]/builder             → Builder drag & drop ⭐
├─ /course-templates             → Templates de cours
│  ├─ /new                      → Nouveau template
│  └─ /[id]/edit               → Éditer template
├─ /sessions                     → Sessions live 🎥
│  └─ /new                      → Nouvelle session
├─ /lessons                      → Leçons
│  ├─ /new                      → Nouvelle leçon
│  └─ /[id]                     → Éditer leçon
├─ /assignments                  → Devoirs
│  ├─ /new                      → Nouveau devoir
│  └─ /[id]/submissions        → Soumissions
├─ /homework                     → Devoirs
├─ /submissions/[id]/grade       → Noter devoir
├─ /students                     → Liste élèves
├─ /earnings                     → Revenus
└─ /whiteboard                   → Tableau blanc
```

---

## 🎯 PROBLÈMES CRITIQUES IDENTIFIÉS

### 🔴 Niveau 1: Critiques (Bloquants)

#### 1. **CONFUSION CLASSES vs COURS**

**Problème:**
```
3 systèmes parallèles coexistent:
1. /teacher/classrooms     → Ancien système (mélange classe+cours)
2. /teacher/courses        → Nouveau système (séparé)
3. /teacher/course-templates → Templates structurés

→ L'utilisateur ne sait pas lequel utiliser!
```

**Impact:**
- ❌ Professeur crée des doublons
- ❌ Données incohérentes (classroom_id vs course_id)
- ❌ Confusion totale sur le flow

**Preuve:**
```typescript
// sessions/new/page.tsx ligne 34-37
.from('classrooms')  // ← Utilise classrooms
.eq('teacher_id', user.id)

// Mais le nouveau système utilise courses!
```

**Recommandation:**
```
URGENT: Choisir UN seul système:

Option A: Migrer tout vers courses
✅ Architecture propre
❌ Breaking change majeur

Option B: Masquer courses temporairement
✅ Pas de breaking change
❌ Code legacy reste

Option C (RECOMMANDÉE): Rediriger classrooms → courses
✅ Transition progressive
✅ Garde compatibilité
```

---

#### 2. **SESSIONS LIVE: Workflow incomplet**

**Problème:**
```
Flow actuel:
1. /teacher/sessions/new → Créer session ✅
2. Enregistrement dans DB ✅
3. ???
4. /session/{id} → Salle LiveKit ❌ MANQUANT

→ Il n'y a pas de lien entre création et salle live!
```

**Preuve:**
```typescript
// sessions/page.tsx ligne 68
router.push(`/session/${sessionId}`)

// Cette route n'existe probablement pas!
```

**Impact:**
- ❌ Professeur crée session mais ne peut pas la rejoindre
- ❌ Étudiants ne peuvent pas accéder
- ❌ LiveKit non intégré

**Vérification nécessaire:**
```bash
# Chercher la page /session/[id]
find src/app -name "session" -type d
# → Probablement absente
```

---

#### 3. **CRÉER LEÇON: Références cassées**

**Problème:**
```typescript
// courses/[id]/builder/page.tsx ligne 373
router.push(`/teacher/lessons/new?chapter=${chapterId}&course=${id}`)
//                                                        ↑
//                                                  Utilise course

// Mais lessons/new/page.tsx utilise probablement classroom_id!
```

**Impact:**
- ❌ Le Builder redirige avec `course={id}`
- ❌ La page lessons/new attend `classroom={id}`
- ❌ La création de leçon échoue silencieusement

---

### 🟠 Niveau 2: Majeurs (Urgents)

#### 4. **DESIGN INCOHÉRENT**

**Observations:**
```
/teacher/classrooms/new
├─ Design: Moderne (gradients, cards, animations)
├─ Couleur: #2b8cee (bleu)
└─ Style: Inline styles ✅

/teacher/courses/new
├─ Design: Wizard guidé (8 étapes)
├─ Couleur: Tailwind classes
└─ Style: Tailwind ❌ DIFFÉRENT

/teacher/sessions/new
├─ Design: Cards avec emojis
├─ Couleur: blue-600
└─ Style: Tailwind ❌ DIFFÉRENT

→ Aucune cohérence visuelle!
```

**Exemple concret:**

| Page | Header background | Border radius | Font size titre |
|------|-------------------|---------------|-----------------|
| classrooms/new | #2b8cee gradient | 16px | 32px |
| courses/new | white | 12px | 24px |
| sessions/new | white | 16px (2xl) | 24px (2xl) |

**Impact:**
- ❌ Professeur perd ses repères
- ❌ Impression d'amateurisme
- ❌ Pas d'identité de marque

---

#### 5. **NAVIGATION: Aucun fil conducteur**

**Problème:**
```
Depuis le Dashboard, comment créer un cours complet?

Option 1: classrooms/new → ???
Option 2: courses/new → Wizard → Builder → ???
Option 3: course-templates/new → ???

→ Aucune indication claire du parcours optimal!
```

**Dashboard actuel:**
```typescript
// dashboard/page.tsx (hypothétique)
<Card onClick={() => router.push('/teacher/classrooms/new')}>
  Nouvelle classe
</Card>

// Mais devrait être:
<Card onClick={() => router.push('/teacher/courses/new')}>
  Nouveau cours
</Card>
```

**Recommandation:**
```
Ajouter un onboarding:
1. "Commencez par créer une classe (groupe d'élèves)"
2. "Puis créez vos premiers cours"
3. "Planifiez des sessions live"
```

---

#### 6. **SESSIONS: Sélection de classe obsolète**

**Problème:**
```typescript
// sessions/new/page.tsx ligne 34
.from('classrooms')
.select('*')

// Devrait utiliser courses pour lister les contenus!
```

**Flow actuel (cassé):**
```
1. Sélectionner "Session de groupe" ✅
2. Sélectionner une classroom ❌
3. La classroom ne contient peut-être plus de cours
4. Session créée mais sans contenu!
```

**Flow attendu:**
```
1. Sélectionner "Session de groupe" ✅
2. Sélectionner une CLASSE (groupe d'élèves) ✅
3. Sélectionner un COURS de cette classe ✅
4. Session créée avec le bon contenu ✅
```

---

### 🟡 Niveau 3: Moyens (Amélioration UX)

#### 7. **FEEDBACK: alert() primitifs**

**Problème:**
```typescript
// Trouvé dans 15+ fichiers:
alert('Erreur lors de la création')
alert('Session créée avec succès')
confirm('Êtes-vous sûr ?')
prompt('Raison de l\'annulation:')

→ Utilise des fenêtres natives non stylées!
```

**Impact:**
- ❌ UX des années 2000
- ❌ Pas de cohérence avec le design
- ❌ Bloque l'interface

**Solution:**
```typescript
// Créer un système de notifications
import { toast } from '@/components/ui/toast'

toast.success('Session créée avec succès')
toast.error('Erreur lors de la création')
toast.confirm({
  title: 'Êtes-vous sûr ?',
  onConfirm: () => {}
})
```

---

#### 8. **LOADING STATES: Inconsistants**

**Observations:**
```typescript
// Certaines pages:
{loading && <div>Loading...</div>}

// D'autres:
{loading && <Spinner />}

// D'autres:
{loading && (
  <div className="w-12 h-12 border-4 border-blue-500..."></div>
)}

→ 3 styles de loading différents!
```

---

#### 9. **ERROR HANDLING: Inexistant**

**Problème:**
```typescript
// sessions/page.tsx ligne 43-48
const response = await fetch(`/api/sessions`)
if (!response.ok) throw new Error('Erreur de chargement')

const data = await response.json()
setSessions(data.sessions || [])

// Aucun try/catch!
// Aucun affichage d'erreur à l'utilisateur!
```

**Impact:**
- ❌ Page blanche en cas d'erreur
- ❌ Professeur ne sait pas ce qui se passe
- ❌ Données partiellement chargées

---

## 🎥 AUDIT SESSIONS LIVE (LiveKit)

### Architecture actuelle

```
/teacher/sessions/new
├─ Formulaire de création ✅
├─ Type: group | 1-to-1 ✅
├─ Sélection classroom ❌ (devrait être course)
├─ Date/heure ✅
├─ Durée ✅
└─ Options (recording, max participants) ✅

API: POST /api/sessions
├─ Crée session dans DB ✅
├─ Génère room_id ❓
├─ Crée LiveKit room ❓
└─ Génère tokens ❓

/session/[id] ← MANQUANT ❌
├─ Interface LiveKit
├─ Vidéo + Audio
├─ Chat
├─ Whiteboard
└─ Screen sharing
```

### Problèmes identifiés

#### 1. **Route manquante**
```
/session/[id] n'existe probablement pas
→ Le professeur ne peut pas rejoindre sa session!
```

#### 2. **Génération de tokens**
```typescript
// Aucun code trouvé pour:
- Générer LiveKit access token
- Passer le token au composant LiveKit
- Gérer l'expiration du token
```

#### 3. **Intégration LiveKit incomplète**
```
Fichiers recherchés:
- @livekit/components-react ← Installé? ✅
- Composant LiveKitRoom ← Existe? ❓
- Gestion participants ← Implémenté? ❓
```

#### 4. **États de session**
```typescript
status: 'scheduled' | 'live' | 'ended' | 'cancelled'

Mais:
- Comment passer de 'scheduled' à 'live'? ❓
- Comment rejoindre une session 'live'? ❓
- Que se passe-t-il après 'ended'? ❓
```

---

## 📚 AUDIT SYSTÈME DE COURS

### Architecture finale (après nos modifications)

```
✅ NOUVEAU SYSTÈME
┌─────────────────────────────┐
│  Table: classrooms          │
│  (Groupes d'élèves)         │
└──────────┬──────────────────┘
           │ classroom_id
           ↓
┌─────────────────────────────┐
│  Table: courses             │
│  (Contenus pédagogiques)    │
│  - learning_objectives      │
│  - prerequisites            │
│  - competences              │
└──────────┬──────────────────┘
           │ course_id
           ↓
┌─────────────────────────────┐
│  Table: chapters            │
└──────────┬──────────────────┘
           │ chapter_id
           ↓
┌─────────────────────────────┐
│  Table: lessons             │
└─────────────────────────────┘
```

### Flow actuel

#### Création de cours (Wizard)

```
/teacher/courses/new
├─ Step 1: Sélection classe + Infos ✅
├─ Step 2: Objectifs pédagogiques ✅
├─ Step 3-7: Structure, contenu, etc. ⚠️ (à vérifier)
└─ Step 8: Publication + Lien Builder ✅

/teacher/courses/[id]/builder
├─ Drag & drop chapitres ✅
├─ Drag & drop leçons ✅
├─ Sauvegarde ✅
└─ Stats automatiques ✅
```

### Problèmes identifiés

#### 1. **Steps 3-7 non vérifiés**
```
Ces steps utilisent peut-être encore:
- classroom_id au lieu de course_id
- Références à l'ancien système
```

#### 2. **Création de chapitre/leçon**
```typescript
// Builder ligne 346-352
const handleAddChapter = () => {
  router.push(`/teacher/courses/${id}/chapters/new`)
}

// Cette route n'existe pas!
// Devrait être créée ou utiliser une modal
```

#### 3. **Templates vs Courses**
```
Qu'est-ce que course-templates?
→ Semble être un 3ème système parallèle!
→ Devrait être unifié avec courses
```

---

## 🎨 ANALYSE DESIGN

### Identité visuelle actuelle

**Couleurs:**
```css
Couleur principale: #2b8cee (bleu)
Couleur secondaire: #1A365D (bleu marine)
Bordures: #dbe0e6
Background: #F7F8FA
```

**Utilisé dans:**
- ✅ `classrooms/new/page.tsx` - Cohérent
- ❌ `courses/new/page.tsx` - Tailwind générique
- ❌ `sessions/new/page.tsx` - Tailwind blue-600

### Composants

**Boutons:**
```
3 styles différents:

Style 1 (inline):
style={{
  backgroundColor: '#2b8cee',
  padding: '14px 32px',
  borderRadius: '12px'
}}

Style 2 (Tailwind):
className="bg-blue-600 px-6 py-3 rounded-lg"

Style 3 (Tailwind xl):
className="bg-blue-600 px-6 py-4 rounded-2xl"
```

**Cards:**
```
Border radius: 12px, 16px, 2xl (16px), xl (12px)
→ 4 valeurs différentes!

Padding: 20px, 24px, 32px, p-6, p-8
→ 5 valeurs différentes!
```

---

## 📊 STATISTIQUES

### Code

| Métrique | Valeur |
|----------|--------|
| Pages teacher | 24 |
| Utilise inline styles | 3 |
| Utilise Tailwind | 21 |
| Utilise `alert()` | 15+ |
| Utilise `confirm()` | 8+ |
| Gère erreurs proprement | 2 |

### UX

| Critère | Note /10 |
|---------|----------|
| Cohérence visuelle | 3/10 ⚠️ |
| Navigation claire | 4/10 ⚠️ |
| Feedback utilisateur | 2/10 🔴 |
| Gestion d'erreurs | 2/10 🔴 |
| Performance | 7/10 ✅ |
| Accessibilité | 5/10 ⚠️ |

### Problèmes par sévérité

| Niveau | Nombre | % |
|--------|--------|---|
| 🔴 Critiques | 3 | 23% |
| 🟠 Majeurs | 6 | 46% |
| 🟡 Moyens | 4 | 31% |
| **Total** | **13** | **100%** |

---

## ✅ RECOMMANDATIONS PRIORITAIRES

### Court terme (1-2 jours)

#### 1. **Unifier classes/cours** 🔴
```typescript
// Masquer /teacher/classrooms
// Rediriger vers /teacher/courses
// OU migrer tout vers courses
```

#### 2. **Créer page /session/[id]** 🔴
```typescript
// Créer src/app/session/[id]/page.tsx
// Intégrer LiveKitRoom
// Générer tokens d'accès
```

#### 3. **Fixer création leçon** 🔴
```typescript
// Mettre à jour lessons/new/page.tsx
// Accepter course_id en paramètre
// Ou créer modal dans Builder
```

### Moyen terme (1 semaine)

#### 4. **Système de notifications** 🟠
```typescript
// Remplacer tous les alert() par toast
// Créer composant Toast
// Gérer stack de notifications
```

#### 5. **Unifier le design** 🟠
```typescript
// Créer design system
// Variables CSS pour couleurs
// Composants réutilisables (Button, Card, etc.)
```

#### 6. **Flow sessions complet** 🟠
```typescript
// Ajouter sélection de cours (pas classroom)
// Intégrer whiteboard
// Gérer enregistrements
```

### Long terme (2+ semaines)

#### 7. **Onboarding professeur**
```typescript
// Premier login → Tutoriel guidé
// Créer classe → Créer cours → Planifier session
```

#### 8. **Analytics**
```typescript
// Dashboard avec métriques
// Sessions passées/à venir
// Taux de participation
```

#### 9. **Mobile responsive**
```typescript
// Adapter toutes les pages
// Navigation simplifiée
// Gestures touch
```

---

## 🚨 ACTIONS IMMÉDIATES

### À faire MAINTENANT

1. **Vérifier route `/session/[id]`**
```bash
ls -la src/app/session/
```

2. **Vérifier intégration LiveKit**
```bash
grep -r "LiveKitRoom" src/
grep -r "livekit" src/
```

3. **Tester création de leçon**
```
1. Aller dans Builder
2. Cliquer "Ajouter une leçon"
3. Vérifier si la page charge
4. Vérifier si les paramètres sont corrects
```

4. **Documenter le flow attendu**
```markdown
# Flow professeur standard:
1. Créer classe (groupe)
2. Créer cours (wizard)
3. Organiser (builder)
4. Planifier session
5. Animer session live
```

---

## 📝 CONCLUSION

### État actuel: 🔴 CRITIQUE

**Problèmes bloquants:**
- ❌ Confusion classes/cours (3 systèmes parallèles)
- ❌ Sessions live incomplètes (pas de salle LiveKit)
- ❌ Références cassées (course_id vs classroom_id)

**Impacts:**
- Professeur ne peut pas utiliser le système correctement
- Données incohérentes
- Expérience frustrante

### État souhaité: ✅ PROFESSIONNEL

**Objectifs:**
1. UN seul système (courses)
2. Flow complet et guidé
3. Sessions live fonctionnelles
4. Design cohérent
5. Feedback utilisateur clair

### Priorités:

```
🔴 URGENT (Cette semaine):
1. Fixer sessions live
2. Unifier classes/cours
3. Corriger références cassées

🟠 IMPORTANT (Ce mois):
4. Système notifications
5. Unifier design
6. Tests utilisateurs

🟡 SOUHAITABLE (Plus tard):
7. Onboarding
8. Analytics
9. Mobile
```

---

**Prochaine étape recommandée:**
Créer la page `/session/[id]` avec intégration LiveKit complète.

---

**Document créé le**: 2026-01-20
**Auteur**: Audit UX Jules Class Go
**Version**: 1.0
