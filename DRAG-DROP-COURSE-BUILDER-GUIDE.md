# 🎯 Guide Utilisateur - Organisateur de Cours Drag & Drop

## 📚 Vue d'Ensemble

Le **Constructeur de Cours par Glisser-Déposer** vous permet d'organiser visuellement la structure de vos cours en déplaçant facilement les chapitres et leçons.

---

## 🚀 Accès à l'Organisateur

### Depuis la Page de Gestion du Cours

1. Allez dans **Mes Classes** (`/teacher/classrooms`)
2. Cliquez sur le cours que vous souhaitez organiser
3. Dans l'en-tête du cours, cliquez sur le bouton **🎯 Organiser le cours**

Vous serez redirigé vers l'interface de gestion drag & drop.

---

## 🎨 Interface

### Vue Générale

```
┌─────────────────────────────────────────────────┐
│ ← Retour                    [Non sauvegardé] 💾 │
├─────────────────────────────────────────────────┤
│ Organiser le cours: [Titre du cours]            │
│ Glissez-déposez pour réorganiser                │
├─────────────────────────────────────────────────┤
│ ➕ Ajouter un chapitre                           │
│                                                 │
│ ┌───────────────────────────────────────────┐  │
│ │ ⋮⋮ 1. Chapitre 1                      [⚙️]│  │
│ ├───────────────────────────────────────────┤  │
│ │  ⋮ 1.1 Leçon 1                       [⚙️]│  │
│ │  ⋮ 1.2 Leçon 2                       [⚙️]│  │
│ │  ➕ Ajouter une leçon                    │  │
│ └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### Éléments de l'Interface

**1. Barre d'Actions (en haut)**
- **← Retour** : Retour à la page de gestion du cours
- **Badge "Non sauvegardé"** : Indique des modifications non sauvegardées
- **💾 Sauvegarder** : Enregistre toutes les modifications

**2. Bouton Ajouter un Chapitre**
- Crée un nouveau chapitre à la fin de la liste

**3. Cartes de Chapitres**
- **⋮⋮ Poignée de déplacement** : Cliquez et maintenez pour déplacer le chapitre
- **▼ Expand/Collapse** : Afficher/masquer les leçons
- **Titre et Description** : Informations du chapitre
- **Nombre de leçons** : Compteur en temps réel
- **⚙️ Menu** : Options (Modifier, Ajouter leçon, Supprimer)

**4. Cartes de Leçons**
- **⋮ Poignée de déplacement** : Cliquez et maintenez pour déplacer la leçon
- **Icône de type** : 📹 Vidéo, 📄 PDF, ✅ QCM, etc.
- **Titre** : Nom de la leçon
- **Type et Durée** : Informations complémentaires
- **⚙️ Menu** : Options (Modifier, Supprimer)

---

## 🎯 Fonctionnalités

### 1. Réorganiser les Chapitres

**Comment faire:**
1. Cliquez sur la poignée **⋮⋮** à gauche du titre du chapitre
2. Maintenez le bouton de la souris enfoncé
3. Déplacez le chapitre vers le haut ou le bas
4. Relâchez pour placer le chapitre à sa nouvelle position

**Résultat:**
- Les numéros des chapitres se mettent à jour automatiquement
- L'ordre des leçons à l'intérieur du chapitre est préservé

**Exemple:**
```
Avant:                  Après:
1. Introduction        1. Bases
2. Bases               2. Introduction
3. Avancé              3. Avancé
```

---

### 2. Réorganiser les Leçons dans un Chapitre

**Comment faire:**
1. Développez le chapitre si nécessaire (cliquez sur ▼)
2. Cliquez sur la poignée **⋮** à gauche de la leçon
3. Maintenez et déplacez vers le haut ou le bas
4. Relâchez pour placer la leçon

**Résultat:**
- Les numéros des leçons se mettent à jour automatiquement
- La leçon reste dans le même chapitre

**Exemple:**
```
Chapitre 1:
  Avant:                  Après:
  1.1 Vidéo intro        1.1 Théorie
  1.2 Théorie            1.2 Vidéo intro
  1.3 Exercices          1.3 Exercices
```

---

### 3. Déplacer une Leçon vers un Autre Chapitre

**Comment faire:**
1. Cliquez et maintenez la poignée **⋮** de la leçon
2. Déplacez la leçon vers le chapitre de destination
3. Relâchez la leçon à l'endroit souhaité dans le nouveau chapitre

**Résultat:**
- La leçon change de chapitre
- La numérotation est automatiquement mise à jour
- Les deux chapitres (source et destination) voient leurs leçons réindexées

**Exemple:**
```
Avant:
Chapitre 1:              Chapitre 2:
  1.1 Intro                2.1 Suite
  1.2 Bases ←─┐            2.2 Fin
              │
Après:        │
Chapitre 1:   │          Chapitre 2:
  1.1 Intro   │            2.1 Bases ← (déplacée)
              └────────────→ 2.2 Suite
                            2.3 Fin
```

---

### 4. Ajouter un Chapitre

**Comment faire:**
1. Cliquez sur **➕ Ajouter un chapitre** en haut
2. Vous serez redirigé vers le formulaire de création
3. Remplissez le titre et la description
4. Enregistrez

**Résultat:**
- Le nouveau chapitre apparaît à la fin de la liste
- Vous pouvez ensuite le réorganiser par drag & drop

---

### 5. Ajouter une Leçon

**Comment faire:**

**Option 1 - Depuis le bouton du chapitre:**
1. Cliquez sur le menu **⚙️** du chapitre
2. Sélectionnez **➕ Ajouter une leçon**

**Option 2 - Depuis le bas du chapitre:**
1. Développez le chapitre
2. Cliquez sur **➕ Ajouter une leçon** en bas

**Option 3 - Depuis un chapitre vide:**
1. Un chapitre sans leçon affiche automatiquement un bouton central
2. Cliquez sur **➕ Ajouter une leçon**

**Résultat:**
- Vous êtes redirigé vers le formulaire de création de leçon
- La leçon sera créée à la fin du chapitre sélectionné
- Vous pourrez ensuite la réorganiser

---

### 6. Modifier un Chapitre ou une Leçon

**Chapitre:**
1. Cliquez sur le menu **⚙️** à droite du chapitre
2. Sélectionnez **✏️ Modifier**
3. Modifiez les informations
4. Enregistrez

**Leçon:**
1. Cliquez sur le menu **⚙️** à droite de la leçon
2. Sélectionnez **✏️ Modifier**
3. Modifiez les informations
4. Enregistrez

---

### 7. Supprimer un Chapitre ou une Leçon

**⚠️ ATTENTION : La suppression est irréversible !**

**Chapitre:**
1. Cliquez sur le menu **⚙️** du chapitre
2. Sélectionnez **🗑️ Supprimer**
3. Confirmez la suppression
4. Le chapitre ET toutes ses leçons seront supprimés

**Leçon:**
1. Cliquez sur le menu **⚙️** de la leçon
2. Sélectionnez **🗑️ Supprimer**
3. Confirmez la suppression
4. La leçon est supprimée

**Résultat:**
- Les numéros des éléments restants sont réorganisés automatiquement
- Les modifications sont immédiates (pas besoin de sauvegarder)

---

### 8. Développer/Réduire les Chapitres

**Comment faire:**
1. Cliquez sur l'icône **▼** ou **▶** à gauche du titre du chapitre

**Utilité:**
- Masquer les leçons pour avoir une vue d'ensemble
- Facilite la réorganisation des chapitres sans distraction
- Réduit le scroll sur les longs cours

---

## 💾 Sauvegarde

### Sauvegarde Manuelle

**Quand sauvegarder:**
- Après avoir réorganisé les chapitres
- Après avoir réorganisé les leçons
- Après avoir déplacé des leçons entre chapitres

**Comment sauvegarder:**
1. Cliquez sur le bouton **💾 Sauvegarder** en haut à droite
2. Attendez la confirmation : **✅ Structure du cours sauvegardée avec succès**

**Indicateurs:**
- **Badge "Non sauvegardé"** : Des modifications sont en attente
- **Bouton grisé** : Aucune modification ou sauvegarde en cours
- **Bouton actif** : Prêt à sauvegarder

### Que sauvegarde-t-on ?

La sauvegarde enregistre:
- ✅ L'ordre des chapitres (order_index)
- ✅ L'ordre des leçons dans chaque chapitre (order_index)
- ✅ L'appartenance des leçons à leur chapitre (chapter_id)

**Note:** Les modifications de contenu (titres, descriptions) sont sauvegardées séparément lors de l'édition.

---

## 🎓 Cas d'Usage

### Scénario 1: Réorganiser un Cours Existant

**Situation:** Vous avez créé un cours mais l'ordre n'est pas optimal

**Solution:**
1. Accédez à **Organiser le cours**
2. Déplacez les chapitres dans l'ordre souhaité
3. Au besoin, réorganisez les leçons à l'intérieur
4. Cliquez sur **💾 Sauvegarder**

**Temps:** ~2-5 minutes

---

### Scénario 2: Déplacer un QCM de Validation

**Situation:** Vous avez un QCM qui doit passer du début à la fin du chapitre

**Solution:**
1. Développez le chapitre concerné
2. Glissez le QCM (icône ✅) vers le bas
3. Relâchez à la position finale (en bas)
4. **💾 Sauvegarder**

**Temps:** ~30 secondes

---

### Scénario 3: Fusionner du Contenu de Deux Chapitres

**Situation:** Deux chapitres sont trop petits et doivent être combinés

**Solution:**
1. Développez les deux chapitres
2. Glissez les leçons du chapitre 2 vers le chapitre 1
3. Supprimez le chapitre 2 (maintenant vide)
4. **💾 Sauvegarder**

**Temps:** ~2 minutes

---

### Scénario 4: Créer une Progression Logique

**Situation:** Les leçons sont dans le désordre (vidéo → QCM → théorie)

**Solution idéale:**
1. Réorganisez : Théorie → Vidéo → Exercices → QCM
2. **💾 Sauvegarder**

**Bonnes pratiques:**
- 📝 Commencez par la théorie
- 📹 Ajoutez des vidéos explicatives
- 💡 Proposez des micro-learnings
- ✅ Terminez par un QCM de validation

---

## ⌨️ Raccourcis Clavier (À venir)

Fonctionnalités prévues:
- **Tab** : Naviguer entre les éléments
- **Espace** : Activer le mode déplacement
- **Flèches ↑↓** : Déplacer l'élément sélectionné
- **Echap** : Annuler le déplacement

---

## 🐛 Résolution de Problèmes

### Le glisser-déposer ne fonctionne pas

**Causes possibles:**
- Vous ne cliquez pas sur la poignée **⋮⋮** ou **⋮**
- Le navigateur ne supporte pas le drag & drop (rare)

**Solution:**
- Assurez-vous de cliquer sur la poignée (icône de points)
- Essayez un autre navigateur (Chrome, Firefox, Edge)

---

### Les modifications ne sont pas sauvegardées

**Causes possibles:**
- Vous avez oublié de cliquer sur **💾 Sauvegarder**
- Erreur réseau

**Solution:**
- Vérifiez le badge "Non sauvegardé"
- Cliquez sur **💾 Sauvegarder**
- Vérifiez la confirmation

---

### Une leçon a disparu après déplacement

**Causes possibles:**
- La leçon a été déplacée dans un chapitre réduit
- Vous avez oublié de sauvegarder

**Solution:**
- Développez tous les chapitres (cliquez sur ▶)
- Cherchez la leçon dans les autres chapitres
- Si non trouvée, rechargez la page (sans sauvegarder)

---

### Le numéro des chapitres/leçons est incorrect

**Causes possibles:**
- Affichage temporaire pendant le drag
- Cache du navigateur

**Solution:**
- Sauvegardez et rechargez la page
- Les numéros se recalculent automatiquement

---

## 📱 Mobile et Tablette

### Tablettes (iPad, Android)

Le drag & drop fonctionne avec le tactile:
1. Appuyez longuement sur la poignée
2. Déplacez avec votre doigt
3. Relâchez pour déposer

### Smartphones

**Alternative au drag & drop:**
- Utilisez les menus **⚙️**
- Option "Déplacer vers le haut/bas" (à venir)
- Ou utilisez un ordinateur pour une meilleure expérience

---

## ✅ Bonnes Pratiques

### Structure de Cours Recommandée

**Chapitres:**
1. Introduction (contexte, objectifs)
2. Chapitres thématiques (progressifs)
3. Conclusion (récapitulatif, projet final)

**Leçons par Chapitre:**
1. 📝 Cours théorique (PDF ou Texte)
2. 📹 Vidéo explicative
3. 💡 Micro-learning (points clés)
4. 📄 Exercices (PDF)
5. ✅ QCM de validation

### Conseils d'Organisation

**✅ À FAIRE:**
- Numérotez logiquement (Bases → Avancé)
- Alternez théorie et pratique
- Placez les QCM à la fin des chapitres
- Groupez les leçons par thème

**❌ À ÉVITER:**
- Trop de leçons dans un chapitre (max 10-12)
- QCM au début (les étudiants ne sont pas préparés)
- Ordre aléatoire sans logique
- Chapitres vides ou avec 1 seule leçon

---

## 🚀 Prochaines Fonctionnalités

### En Développement

- 📋 Dupliquer un chapitre ou une leçon
- 📁 Copier/coller entre cours différents
- ↩️ Undo/Redo (annuler/refaire)
- 🔍 Recherche dans la structure
- 📊 Vue arborescente compacte
- ⌨️ Navigation au clavier complète

### Demandées par les Utilisateurs

- 🎨 Templates de structure de cours
- 💾 Sauvegarde automatique (auto-save)
- 📱 Mode mobile amélioré
- 👥 Collaboration en temps réel

---

## 📞 Support

### Besoin d'Aide ?

**Documentation:**
- `DRAG-DROP-COURSE-BUILDER-ARCHITECTURE.md` - Documentation technique
- Cette page - Guide utilisateur

**Contact:**
- Signalez un bug : Issues GitHub
- Demande de fonctionnalité : Issues GitHub
- Assistance : support@julesclassgo.com

---

## 🎉 Félicitations !

Vous maîtrisez maintenant l'organisateur de cours drag & drop !

**Prochaines étapes:**
1. ✅ Organisez votre premier cours
2. ✅ Testez le déplacement entre chapitres
3. ✅ Créez une structure logique et pédagogique
4. ✅ Partagez votre retour d'expérience

**Bon enseignement ! 🎓**

---

**Version:** 1.0
**Date:** 2026-01-18
**Auteur:** Jules Class Go Team
