# Analyse de Scalabilité - Architecture Jules Class Go

## 🏗️ Architecture Actuelle

### Stack Technique
- **Frontend/Backend**: Next.js 15+ (App Router) avec API Routes
- **Base de données**: Supabase (PostgreSQL 15)
- **Auth**: Supabase Auth
- **Paiements**: Stripe
- **Hébergement probable**: Vercel (serverless)
- **Storage**: Supabase Storage (images, vidéos)

---

## 📊 Capacité par Tier

### 1️⃣ Tier GRATUIT (Supabase Free + Vercel Hobby)

#### Limites techniques

| Ressource | Limite | Impact |
|-----------|--------|--------|
| **Supabase DB Connections** | 2 directes + 60 pooled (PgBouncer) | 🔴 Goulot principal |
| **Supabase Database Size** | 500 MB | ⚠️ Limitant si beaucoup de contenu |
| **Supabase Auth MAU** | 50,000 utilisateurs actifs/mois | ✅ Suffisant au début |
| **Supabase Storage** | 1 GB | ⚠️ Limité pour vidéos |
| **Vercel Function Execution** | 100 GB-hours/mois | ⚠️ ~1M invocations |
| **Vercel Bandwidth** | 100 GB/mois | ⚠️ Limitant avec vidéos |
| **Stripe Requests** | 100 req/sec (test), 1000 (prod) | ✅ Non limitant |

#### Calcul de capacité

**Hypothèses:**
- 1 utilisateur actif = 3 requêtes/minute en moyenne (navigation, API calls)
- 1 requête DB = 50-100ms en moyenne (avec RLS + joins)
- Connection pooling efficace à 80%

**Formule:**
```
Capacité DB = (Connexions pooled × 1000ms / Temps moyen requête) × Efficacité
            = (60 × 1000 / 80) × 0.8
            = 600 requêtes/seconde théoriques
            = ~300-400 req/sec réelles (avec overhead RLS, transactions)
```

**Utilisateurs simultanés:**
```
Users simultanés = Requêtes/sec / Requêtes par user par seconde
                 = 350 / (3/60)
                 = 350 / 0.05
                 = 7,000 utilisateurs théoriques
```

**EN PRATIQUE (Tier Gratuit):**
- **500-1,000 utilisateurs simultanés** avec performance acceptable (< 500ms latence)
- **2,000-3,000 utilisateurs actifs/jour** (pas tous en même temps)
- **10,000-15,000 MAU** (Monthly Active Users)

#### Goulots d'étranglement
1. 🔴 **Connexions DB** - Le plus critique
2. 🟡 **Vercel Function GB-hours** - Limite les invocations API
3. 🟡 **Bandwidth** - Problématique si beaucoup de vidéos streamées
4. 🟢 **Stripe** - Non limitant

---

### 2️⃣ Tier PRO (Supabase Pro $25/mois + Vercel Pro $20/mois)

#### Limites améliorées

| Ressource | Limite | Amélioration |
|-----------|--------|--------------|
| **Supabase DB Connections** | 15 directes + 200 pooled | **+233% capacité DB** |
| **Supabase Database Size** | 8 GB | **16x plus d'espace** |
| **Supabase Auth MAU** | Unlimited | ✅ Pas de limite |
| **Supabase Storage** | 100 GB | **100x plus d'espace** |
| **Vercel Function Execution** | 1,000 GB-hours/mois | **10x plus d'invocations** |
| **Vercel Bandwidth** | 1 TB/mois | **10x plus de bande passante** |

#### Calcul de capacité

**Capacité DB améliorée:**
```
Capacité DB = (200 × 1000 / 80) × 0.8
            = ~1,600 req/sec réelles
```

**EN PRATIQUE (Tier Pro):**
- **3,000-5,000 utilisateurs simultanés** avec bonne performance
- **15,000-25,000 utilisateurs actifs/jour**
- **50,000-100,000 MAU**

---

### 3️⃣ Tier TEAM (Supabase Team $599/mois + Vercel Team $40/mois)

#### Limites entreprise

| Ressource | Limite | Capacité |
|-----------|--------|----------|
| **Supabase DB Connections** | 60 directes + 400 pooled | **6.6x capacité Pro** |
| **Supabase Database Size** | 100 GB | **12.5x capacité Pro** |
| **Compute** | Dedicated 4-core 16GB RAM | **Performances optimales** |
| **Read Replicas** | Disponibles | **Scalabilité horizontale** |
| **Vercel Concurrent Builds** | 12 | **Déploiement rapide** |

**EN PRATIQUE (Tier Team):**
- **10,000-30,000 utilisateurs simultanés**
- **100,000-300,000 utilisateurs actifs/jour**
- **500,000-1,000,000 MAU**

---

## 🔥 Points de Saturation par Fonctionnalité

### Landing Page (/)
**Charge légère - Statique avec SSG**
- Capacité: ✅ **50,000+ users simultanés** (CDN cache)
- Aucune requête DB jusqu'au clic sur CTA
- Limité uniquement par Vercel bandwidth

### Authentification (/login, /register)
**Charge moyenne - Supabase Auth + DB**
- Capacité Gratuit: **100 inscriptions/minute**
- Capacité Pro: **500 inscriptions/minute**
- Goulot: Écriture DB (création user + profile)

### Recherche de cours (/courses, /search)
**Charge élevée - Requêtes DB complexes**
- Capacité Gratuit: **500 users simultanés** (1 req/user)
- Capacité Pro: **2,000 users simultanés**
- Optimisations possibles:
  - Cache Redis (pas implémenté actuellement)
  - Pagination (déjà en place ✅)
  - Indexes DB (vérifier si complets)

### Checkout/Paiement
**Charge critique - Transactions + Stripe + Webhook**
- Capacité Gratuit: **50 paiements/minute** (limité par write DB + Stripe webhooks)
- Capacité Pro: **200 paiements/minute**
- Point critique: Webhook doit répondre en < 5 secondes
- Risque: Si webhook échoue, retry Stripe peut saturer

### Booking 1-to-1 (Page calendrier)
**Charge très élevée - Calcul de disponibilités**
- Capacité Gratuit: **200 users simultanés** (requête complexe)
- Capacité Pro: **800 users simultanés**
- Problème actuel: **Logique de génération de slots côté API** (CPU-intensive)

### Streaming Vidéo (Classrooms)
**Charge extrême - Bandwidth**
- Capacité Gratuit: **50 users simultanés** regardant une vidéo (100 GB/mois)
- Capacité Pro: **500 users** (1 TB/mois)
- Recommandation: **Migrer vers CDN vidéo** (Cloudflare Stream, Mux)

### Live Sessions (1-to-1 vidéo)
**Charge externe - LiveKit**
- Non limité par notre infra
- Limité par config LiveKit (à définir)

---

## 🚨 Scénarios de Charge Réaliste

### Scénario 1: Lancement (Premiers 6 mois)
**Profil:** 5,000 MAU, 200 users simultanés en peak hours

| Métrique | Valeur | Statut Gratuit | Statut Pro |
|----------|--------|----------------|------------|
| Users simultanés peak | 200 | ✅ OK | ✅ OK |
| Paiements/jour | 50 | ✅ OK | ✅ OK |
| Stockage DB | 200 MB | ✅ OK | ✅ OK |
| Bandwidth | 30 GB/mois | ✅ OK | ✅ OK |

**Recommandation: GRATUIT suffit** ✅

---

### Scénario 2: Croissance (6-18 mois)
**Profil:** 25,000 MAU, 800 users simultanés en peak, 150 paiements/jour

| Métrique | Valeur | Statut Gratuit | Statut Pro |
|----------|--------|----------------|------------|
| Users simultanés peak | 800 | 🔴 Saturé | ✅ OK |
| Paiements/jour | 150 | 🟡 Limite | ✅ OK |
| Stockage DB | 2 GB | 🔴 Dépassé | ✅ OK |
| Bandwidth | 300 GB/mois | 🔴 Dépassé | ✅ OK |
| Function GB-hours | 200 | 🔴 Dépassé | ✅ OK |

**Recommandation: Passer en PRO** 🚀

---

### Scénario 3: Scale (18+ mois)
**Profil:** 100,000 MAU, 3,000 users simultanés, 500 paiements/jour

| Métrique | Valeur | Statut Pro | Statut Team |
|----------|--------|------------|-------------|
| Users simultanés peak | 3,000 | 🟡 Limite | ✅ OK |
| Paiements/jour | 500 | ✅ OK | ✅ OK |
| Stockage DB | 15 GB | 🔴 Dépassé | ✅ OK |
| Read replicas | Non | 🔴 Besoin | ✅ Disponible |

**Recommandation: Passer en TEAM + Optimisations** 🏆

---

## ⚡ Optimisations Recommandées par Ordre de Priorité

### 🔴 CRITIQUE - À faire MAINTENANT (même en gratuit)

#### 1. Indexes sur tables critiques
```sql
-- Vérifier les indexes existants
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Ajouter si manquants
CREATE INDEX CONCURRENTLY idx_bookings_teacher_scheduled
ON bookings(teacher_id, scheduled_at)
WHERE status NOT IN ('cancelled', 'no_show');

CREATE INDEX CONCURRENTLY idx_transactions_student_status
ON transactions(student_id, status);

CREATE INDEX CONCURRENTLY idx_enrollments_student_classroom
ON enrollments(student_id, classroom_id);

CREATE INDEX CONCURRENTLY idx_classrooms_published
ON classrooms(published_at)
WHERE published_at IS NOT NULL;
```

#### 2. Optimiser les RLS policies
**Problème actuel:** Chaque requête exécute les policies RLS (overhead)

```sql
-- Exemple: Optimiser la policy transactions
-- AVANT (lent)
CREATE POLICY "Users view own transactions"
ON transactions FOR SELECT
USING (auth.uid() = student_id OR auth.uid() = teacher_id);

-- APRÈS (plus rapide avec index)
CREATE INDEX CONCURRENTLY idx_transactions_student_teacher
ON transactions(student_id, teacher_id);
```

#### 3. Pagination stricte partout
**Vérifier que TOUTES les listes sont paginées:**
```typescript
// ✅ BON
const { data } = await supabase
  .from('classrooms')
  .select('*')
  .range(0, 19) // 20 items max
  .limit(20)

// ❌ MAUVAIS (peut charger 1000+ rows)
const { data } = await supabase
  .from('classrooms')
  .select('*')
```

#### 4. Limiter les données retournées
```typescript
// ❌ MAUVAIS - Charge tout (content peut être 100KB)
.select('*')

// ✅ BON - Charge uniquement ce qui est affiché
.select('id, title, description, price, thumbnail_url')
```

---

### 🟡 IMPORTANT - À faire en Phase de Croissance

#### 5. Mettre en cache les pages statiques (ISR)
```typescript
// Dans src/app/page.tsx (landing)
export const revalidate = 3600 // Cache 1 heure

// Dans src/app/courses/page.tsx
export const revalidate = 300 // Cache 5 minutes
```

#### 6. Déplacer la génération de slots côté client
**Problème actuel:** `/api/teachers/[id]/availability` génère tous les slots côté serveur

**Solution:**
```typescript
// API: Retourner uniquement les bookings existants
export async function GET() {
  return NextResponse.json({
    existingBookings: [...],
    teacherAvailability: [...] // Plages horaires générales
  })
}

// Client: Générer les slots dynamiquement
function generateSlots(existingBookings, teacherAvailability) {
  // Logique côté client (pas de charge serveur)
}
```

#### 7. Implémenter un système de cache (Redis/Upstash)
```typescript
// Cache pour requêtes fréquentes
const cachedCourses = await redis.get('courses:popular')
if (cachedCourses) return JSON.parse(cachedCourses)

const courses = await supabase.from('classrooms').select('*')
await redis.set('courses:popular', JSON.stringify(courses), { ex: 300 })
```

---

### 🟢 NICE TO HAVE - Optimisations Avancées

#### 8. CDN pour vidéos (Cloudflare Stream / Mux)
```typescript
// Migrer de Supabase Storage vers CDN vidéo
// Économie de bandwidth: 90%+
```

#### 9. Read Replicas pour requêtes analytiques
```sql
-- Rediriger les requêtes lourdes (stats, rapports) vers replica
-- Requêtes write restent sur primary
```

#### 10. Serverless Functions vers Edge Functions
```typescript
// Vercel Edge Functions (plus rapides, moins chers)
export const runtime = 'edge'

export async function GET() {
  // Latence: 50ms vs 200ms
}
```

#### 11. Webhook queue avec retry intelligent
```typescript
// Au lieu de traiter les webhooks de manière synchrone
// Utiliser une queue (Inngest, QStash)
await inngest.send({
  name: 'payment.completed',
  data: { sessionId: session.id }
})
```

---

## 📈 Monitoring & Alertes Critiques

### Métriques à surveiller en production

#### 1. Supabase Dashboard
- **Database connections** (seuil alerte: > 80% de la limite)
- **Database size** (seuil alerte: > 70% de la limite)
- **Slow queries** (> 1 seconde)
- **API requests/sec**

#### 2. Vercel Dashboard
- **Function execution time** (p99 latency)
- **Function errors** (taux d'erreur > 1%)
- **Bandwidth usage** (projection vs limite)

#### 3. Stripe Dashboard
- **Webhook retry rate** (doit être < 5%)
- **Failed payments** (analyser les raisons)

#### 4. Alertes critiques à configurer

```yaml
# Exemple avec monitoring (Sentry, Betterstack, etc.)
alerts:
  - name: "DB connections saturées"
    condition: "connections > 50 (sur 60)"
    action: "Slack + Email"

  - name: "Webhook failures"
    condition: "webhook_errors > 10 en 5 min"
    action: "PagerDuty"

  - name: "API latency élevée"
    condition: "p95_latency > 2000ms"
    action: "Slack"
```

---

## 🎯 Recommandations Finales

### Pour les 3 premiers mois (MVP)
✅ **Rester sur le tier GRATUIT**
- Implémenter les optimisations CRITIQUES (indexes, pagination)
- Monitorer quotidiennement Supabase dashboard
- Objectif: Valider le product-market fit

### Quand passer en PRO ?
📊 **Seuils de déclenchement:**
- \> 500 users simultanés en peak hours
- \> 50 GB bandwidth/mois
- \> 300 MB database size
- \> 10,000 MAU

### Quand passer en TEAM ?
🚀 **Seuils de déclenchement:**
- \> 2,000 users simultanés
- \> 50,000 MAU
- Besoin de read replicas (requêtes analytiques lentes)
- SLA critique (99.9% uptime nécessaire)

### Plan de scale à long terme
```
Phase 1 (0-6 mois): Gratuit + Optimisations
  ↓
Phase 2 (6-18 mois): Pro + Cache Redis
  ↓
Phase 3 (18-36 mois): Team + CDN Vidéo + Read Replicas
  ↓
Phase 4 (36+ mois): Enterprise / Dedicated infra
```

---

## 💰 Coûts Estimés par Scénario

| Scénario | MAU | Infra/mois | Total/mois |
|----------|-----|------------|------------|
| **MVP** | 5K | $0 (Gratuit) | $0 |
| **Croissance** | 25K | $45 (Pro) | $45 |
| **Scale** | 100K | $639 (Team) + $50 (Redis) | $689 |
| **Mature** | 500K | $1,500+ (Enterprise) | $1,500+ |

---

## ✅ Checklist d'Optimisation Immédiate

Avant de lancer en production, vérifier:

- [ ] Tous les indexes critiques sont créés
- [ ] Toutes les listes sont paginées (limit + range)
- [ ] Aucune requête `select('*')` sur tables volumineuses
- [ ] RLS policies optimisées avec indexes
- [ ] Pages statiques utilisent ISR (revalidate)
- [ ] Webhook répond en < 3 secondes
- [ ] Monitoring configuré (Supabase + Vercel)
- [ ] Alertes configurées pour seuils critiques
- [ ] Plan de migration vers Pro documenté

---

**Conclusion:** Avec les optimisations CRITIQUES, l'architecture actuelle peut supporter **500-1,000 users simultanés en tier gratuit**, et **3,000-5,000 users avec tier Pro**. Pour aller au-delà, il faudra ajouter du cache (Redis) et des read replicas.
