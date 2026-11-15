# 🚀 Guide Rapide - Optimiser la Base de Données

## ⚡ Quel script utiliser ?

### Option 1: Script Rapide (RECOMMANDÉ pour MVP/Dev)
**Fichier:** `supabase-performance-optimization-v2.sql`

✅ **Avantages:**
- Exécution en 1 clic (30 secondes)
- Tout est créé automatiquement
- Parfait si vous n'avez pas encore d'utilisateurs actifs

⚠️ **Inconvénient:**
- Les tables sont lockées pendant 1-2 secondes pendant la création des indexes
- Pas grave si personne n'utilise l'app en ce moment

**👉 Comment utiliser:**
1. Ouvrir Supabase → SQL Editor
2. Copier-coller **TOUT** le contenu du fichier `supabase-performance-optimization-v2.sql`
3. Cliquer "Run"
4. Attendre ~30 secondes
5. ✅ Terminé!

---

### Option 2: Script Sans Lock (pour Production avec Users Actifs)
**Fichier:** `supabase-indexes-concurrently.sql`

✅ **Avantages:**
- Aucun lock sur les tables
- Les utilisateurs peuvent continuer à utiliser l'app normalement
- Sécurisé pour la production

⚠️ **Inconvénient:**
- Doit être exécuté index par index (12 commandes séparées)
- Prend ~5-10 minutes au total

**👉 Comment utiliser:**
1. Ouvrir Supabase → SQL Editor
2. Copier la **première** commande CREATE INDEX
3. Cliquer "Run"
4. Attendre que ça finisse (5-30 secondes)
5. Répéter pour les 11 autres indexes
6. ✅ Terminé!

---

## 📊 Vérifier que ça a marché

Après avoir exécuté l'un des scripts, exécuter ces queries:

### 1. Vérifier les indexes créés
```sql
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
```

**Résultat attendu:** Au moins 12 indexes listés

---

### 2. Monitorer les connexions DB
```sql
SELECT * FROM db_connections_monitor;
```

**Résultat attendu:**
```
total_connections | active_queries | idle_connections | waiting_queries | longest_query_seconds
        5         |       1        |        4         |        0        |         0.12
```

---

### 3. Voir la taille de votre DB
```sql
SELECT * FROM db_table_sizes;
```

**Résultat attendu:**
```
tablename    | total_size | size_bytes
users        | 256 KB     | 262144
classrooms   | 128 KB     | 131072
transactions | 64 KB      | 65536
...
```

---

### 4. Voir les transactions des dernières 24h
```sql
SELECT * FROM recent_transactions_summary;
```

---

## 🎯 Impact Attendu

Après l'optimisation, vous devriez observer:

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| **Capacité (users simultanés)** | 500 | 800-1,000 | +60-100% |
| **Latence page /courses** | 800ms | 500ms | -37% |
| **Latence page /book** | 1,200ms | 700ms | -42% |
| **Queries DB/sec supportées** | 350 | 500+ | +43% |

---

## 🐛 Résolution de Problèmes

### Erreur: "relation does not exist"
**Cause:** Une table n'existe pas encore (ex: notifications)

**Solution:** Supprimer les lignes concernant cette table du script, ou créer la table d'abord

---

### Erreur: "CREATE INDEX CONCURRENTLY cannot run inside a transaction block"
**Cause:** Vous avez copié-collé tout le fichier `supabase-indexes-concurrently.sql`

**Solution:** Utiliser le fichier `supabase-performance-optimization-v2.sql` à la place, OU exécuter les commandes une par une

---

### Erreur: "index already exists"
**Cause:** Vous avez déjà exécuté le script avant

**Solution:** C'est normal! Les indexes existent déjà. Vous pouvez ignorer cette erreur.

---

### Erreur: "permission denied"
**Cause:** Votre utilisateur Supabase n'a pas les droits

**Solution:**
1. Aller dans Supabase Dashboard → Settings → Database
2. Copier le "Connection string" avec le role `postgres`
3. Utiliser un client SQL (TablePlus, pgAdmin) avec ce role
4. OU contacter le support Supabase

---

## ✅ Checklist Finale

Après avoir exécuté le script, vérifier:

- [ ] Au moins 12 indexes créés (query ci-dessus)
- [ ] Aucune erreur dans les logs Supabase
- [ ] Les vues de monitoring sont créées (`db_connections_monitor`, etc.)
- [ ] Les fonctions utilitaires existent (`is_slot_available`, etc.)
- [ ] Les triggers sont actifs (enrollment_count_trigger)

---

## 🚀 Prochaines Étapes

Une fois les optimisations DB en place:

### 1. Tester les performances
```bash
# Dans le navigateur
# Ouvrir DevTools → Network → Slow 3G
# Tester les pages:
# - /courses
# - /book/[teacherId]
# - /checkout
```

### 2. Activer le monitoring
- Aller dans Supabase Dashboard → Reports
- Activer les rapports hebdomadaires
- Configurer des alertes (si tier Pro)

### 3. Optimisations Frontend (optionnel)
```typescript
// Activer le cache ISR dans les pages statiques
// src/app/page.tsx
export const revalidate = 3600 // 1 heure

// src/app/courses/page.tsx
export const revalidate = 300 // 5 minutes
```

### 4. Passer en tier Pro quand:
- \> 500 users simultanés en peak
- \> 50 GB bandwidth/mois
- \> 300 MB database size
- Latence p95 > 1 seconde

---

## 📞 Besoin d'Aide ?

- **Erreur d'exécution?** → Copier-coller l'erreur complète
- **Performances toujours lentes?** → Vérifier les indexes avec la query ci-dessus
- **Questions sur le monitoring?** → Lire `ARCHITECTURE-SCALABILITY-ANALYSIS.md`

---

**Bon courage! 🎉**
