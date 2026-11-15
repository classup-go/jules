# ⚠️ ERREUR: Constraint education_level - 28 Janvier 2026

**Heure**: Juste après activation de la nouvelle page complete-profile
**Erreur**: Code 23514 - Violation contrainte check_education_level_valid

---

## 📌 RÉSUMÉ RAPIDE

**Problème**: La base de données accepte seulement `('college', 'lycee', 'bac')` mais le code envoie `('sixieme', 'terminale', 'bac_plus_3')`.

**Solution**: Exécuter la migration 008 dans Supabase SQL Editor.

**Durée**: 2 minutes

---

## 🚀 FIX EXPRESS (Copy-Paste)

### Dans Supabase SQL Editor:

```sql
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_education_level_valid;

ALTER TABLE users
  ADD CONSTRAINT check_education_level_valid
  CHECK (
    education_level IS NULL OR education_level IN (
      'sixieme', 'cinquieme', 'quatrieme', 'troisieme',
      'seconde', 'premiere', 'terminale',
      'bac_obtenu', 'bac_plus_1', 'bac_plus_2', 'bac_plus_3',
      'bac_plus_4', 'bac_plus_5', 'superieur',
      'college', 'lycee', 'terminal', 'bac', 'university', 'other'
    )
  );
```

**Exécuter** → **Recharger la page** → **Tester le formulaire**

---

## 📂 DOCUMENTATION COMPLÈTE

Voir: [FIX-EDUCATION-LEVEL-CONSTRAINT.md](FIX-EDUCATION-LEVEL-CONSTRAINT.md)

---

## ✅ APRÈS LE FIX

La page `/complete-profile` fonctionnera correctement avec:
- ✅ Niveaux détaillés (6ème, Terminale, Bac +3, etc.)
- ✅ Spécialités (STMG, STI2D, Générale, etc.)
- ✅ Sauvegarde sans erreur

---

**Créé**: 28 janvier 2026
**Priorité**: URGENTE
**Temps estimé**: 2 minutes
