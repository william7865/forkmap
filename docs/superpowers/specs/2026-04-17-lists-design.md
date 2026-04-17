# Spec : Listes dans Enregistrés

**Date :** 2026-04-17  
**Statut :** Approuvé  
**Projet :** ForkMap — Next.js 15, TypeScript, Supabase, Tailwind/CSS-in-JS

---

## Contexte

ForkMap permet déjà d'enregistrer des restaurants (favoris). L'utilisateur veut organiser ces enregistrements en **listes thématiques** (ex. "À tester", "Brunch", "Week-end") avec visibilité privée/publique, en vue du futur partage avec des amis.

---

## Périmètre

Ce spec couvre **uniquement les listes**. Les fonctionnalités amis (partage, position temps réel) feront l'objet d'un spec séparé. La table `favorites` existante reste inchangée — elle représente "Tous les enregistrements".

---

## UX détaillée

### 1. Enregistrer dans une liste

**Déclencheur :** tap sur le signet (BookmarkButton) depuis `PlaceDetail` ou `PlaceCard`.

**Comportement actuel conservé :** le tap enregistre toujours dans `favorites` (= "Tous les enregistrements") en premier. La liste est un niveau de classement supplémentaire, pas un remplacement.

**Nouveau :** après le tap, un **popup compact** apparaît (position : au-dessus du bouton, aligné à droite) :

```
┌─────────────────────────────┐
│ ENREGISTRER DANS…           │
│ ☑  À tester          (5)    │
│ ☐  Brunch            (3)    │
│ ☐  Week-end          (1)    │
│ ─────────────────────────── │
│ + Nouvelle liste            │
└─────────────────────────────┘
```

- Chaque ligne est une checkbox : cocher = `INSERT list_items`, décocher = `DELETE list_items`
- Les listes où le lieu est déjà présent apparaissent cochées à l'ouverture
- Cliquer en dehors du popup le ferme
- "Nouvelle liste" ouvre la **modal de création**
- Le popup est affiché via `position: absolute` dans un portail React (pas de z-index conflict avec la carte Leaflet)

### 2. Créer une liste

**Modal de création** (overlay centré, backdrop blur) :

- Champ **Nom** (obligatoire, max 40 caractères, placeholder "Ma liste")
- Champ **Description** (optionnel, textarea, max 120 caractères)
- Toggle **Visibilité** : Privée (défaut) ↔ Publique
  - Privée = visible uniquement par toi
  - Publique = visible par tes amis (feature amis à venir)
- Bouton "Créer" (disabled si nom vide)
- Bouton "Annuler"

À la création : la liste est créée en base, le lieu courant est automatiquement ajouté dedans, le popup se met à jour.

### 3. Page Enregistrés — nouveau layout

**URL :** `/favorites` (inchangée)

**Structure de la page :**

```
Enregistrés                              [Trier ▾]

┌──────────────┐  ┌──────────────┐
│  [dégradé]   │  │  [dégradé]   │
│              │  │              │
│  À tester    │  │  Brunch      │
│  5 lieux 🔒  │  │  3 lieux 🌍  │
└──────────────┘  └──────────────┘
┌──────────────┐
│  + Nouvelle  │
│    liste     │  (bordure pointillée)
└──────────────┘

──── Récemment enregistrés ────

[PlaceCard] Le Comptoir
[PlaceCard] Bistro Marcel
...
```

**Grille de listes :**

- 2 colonnes, gap 12px
- Chaque carte : dégradé de couleur généré à partir du nom (teinte HSL déterministe), nom, compteur, icône 🔒 (privée) ou 🌍 (publique)
- Tap sur une carte → vue détail de la liste (voir §4)
- Tap sur "+ Nouvelle liste" → modal de création

**Section "Récemment enregistrés" :**

- Tous les lieux de `favorites`, triés par `created_at DESC`
- Même composant `PlaceCard` existant, pas de modification

### 4. Vue détail d'une liste

**URL :** `/favorites?list=<list_id>` (query param, pas de nouvelle route)

**Structure :**

```
← Enregistrés          [Modifier] [Supprimer]

À tester
Description optionnelle ici
5 lieux · Privée

[PlaceCard] ...
[PlaceCard] ...
```

- Breadcrumb "← Enregistrés" → retour à la page principale
- Bouton Modifier → modal d'édition (même form que création, pré-rempli)
- Bouton Supprimer → confirmation → `DELETE lists WHERE id=...` (les `list_items` sont supprimés en cascade)
- Les PlaceCards dans la liste ont un bouton retrait (X) qui fait `DELETE list_items`

### 5. Modifier / Supprimer une liste

**Modifier :** même modal que la création, pré-rempli avec les valeurs existantes.

**Supprimer :** dialog de confirmation → supprime la liste et tous ses items (cascade DB). Les lieux restent dans `favorites`.

---

## Base de données

### Table `lists`

```sql
CREATE TABLE lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) <= 40),
  description TEXT CHECK (char_length(description) <= 120),
  is_public   BOOLEAN NOT NULL DEFAULT false,
  color_hue   SMALLINT NOT NULL DEFAULT 160,  -- teinte HSL 0-360 pour le dégradé
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON lists FOR ALL USING (auth.uid() = user_id);
```

### Table `list_items`

```sql
CREATE TABLE list_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id         UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  osm_id          TEXT NOT NULL,
  place_snapshot  JSONB NOT NULL,  -- même structure que favorites.place_data
  added_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (list_id, osm_id)
);

-- RLS
ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner" ON list_items FOR ALL
  USING (list_id IN (SELECT id FROM lists WHERE user_id = auth.uid()));
```

### Index

```sql
CREATE INDEX list_items_list_id ON list_items(list_id);
CREATE INDEX lists_user_id ON lists(user_id);
```

---

## API Routes

| Method | Route                             | Description                                              |
| ------ | --------------------------------- | -------------------------------------------------------- |
| GET    | `/api/lists`                      | Toutes les listes de l'utilisateur (avec count)          |
| POST   | `/api/lists`                      | Créer une liste                                          |
| PATCH  | `/api/lists/[id]`                 | Modifier nom/description/visibilité                      |
| DELETE | `/api/lists/[id]`                 | Supprimer une liste                                      |
| GET    | `/api/lists/[id]/items`           | Lieux d'une liste                                        |
| POST   | `/api/lists/[id]/items`           | Ajouter un lieu à une liste                              |
| DELETE | `/api/lists/[id]/items/[osm_id]`  | Retirer un lieu d'une liste                              |
| GET    | `/api/lists/for-place?osm_id=...` | Quelles listes contiennent ce lieu (pour les checkboxes) |

Toutes les routes utilisent `requireUser(req)` de `lib/api-auth.ts` (pattern existant).

---

## Nouveaux composants

| Composant                              | Rôle                                                     |
| -------------------------------------- | -------------------------------------------------------- |
| `components/lists/SaveToListPopup.tsx` | Popup compact avec checkboxes + "Nouvelle liste"         |
| `components/lists/CreateListModal.tsx` | Modal création/édition d'une liste                       |
| `components/lists/ListCard.tsx`        | Carte de liste dans la grille (dégradé + nom + compteur) |
| `lib/hooks/useLists.ts`                | Hook : fetch listes, CRUD, état des listes pour un lieu  |

---

## Modifications de fichiers existants

| Fichier                            | Changement                                                        |
| ---------------------------------- | ----------------------------------------------------------------- |
| `components/ui/HeartButton.tsx`    | Intégrer `SaveToListPopup` — après toggle favori, ouvrir le popup |
| `components/place/PlaceDetail.tsx` | Passer `osm_id` et `place` au HeartButton pour le popup           |
| `app/(pages)/favorites/page.tsx`   | Ajouter grille de listes + vue détail (query param `list`)        |
| `sql/schema.sql`                   | Ajouter les deux nouvelles tables + RLS + index                   |

---

## Couleur des listes (dégradé déterministe)

Pour éviter de stocker une couleur arbitraire, la teinte HSL est calculée à partir du nom :

```typescript
function listHue(name: string): number {
  return name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
}
// Dégradé : `linear-gradient(135deg, hsl(${hue},40%,25%), hsl(${hue},55%,45%))`
```

Le champ `color_hue` en base permet à l'utilisateur de personnaliser plus tard (hors scope).

---

## Ce qui est hors scope (ce spec)

- Partage de liste avec des amis (spec amis)
- Réorganisation des lieux dans une liste (drag & drop)
- Photo de couverture pour une liste
- Limite du nombre de listes (pas de limite pour l'instant)
- Notifications quand un ami enregistre dans une liste publique

---

## Critères de succès

1. L'utilisateur peut créer une liste depuis le popup "Enregistrer dans…"
2. Un lieu peut être dans 0, 1 ou plusieurs listes
3. La page Enregistrés affiche la grille de listes + le flux global
4. Cliquer une liste affiche ses lieux avec option de retrait
5. Supprimer une liste ne supprime pas les favoris
6. Les routes API sont protégées (RLS + `requireUser`)
7. Le build Vercel passe sans erreur
