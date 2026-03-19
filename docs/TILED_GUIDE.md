# 🗺️ Guide Créateur de Maps — TableTopeke

Ce guide explique comment créer des maps compatibles TableTopeke avec Tiled Map Editor
et le tileset 0x72 Dungeon. Rédigé pour un public familier avec Unity/C#.

---

## 1. Télécharger et installer Tiled Map Editor

1. Aller sur **https://www.mapeditor.org/**
2. Cliquer sur **Download** → choisir la version pour votre OS (Windows, Mac, Linux)
3. Installer Tiled (installeur classique, pas d'étapes particulières)
4. Lancer Tiled — l'interface ressemble à un éditeur de scène Unity avec des tiles

> **Équivalent Unity** : Tiled est l'équivalent de la fenêtre Tile Palette + Tilemap dans Unity.

---

## 2. Télécharger le tileset 0x72 Dungeon

Le tileset graphique n'est **pas inclus** dans le dépôt pour des raisons de licence.
Il doit être téléchargé et placé manuellement.

### Téléchargement

1. Aller sur **https://0x72.itch.io/dungeontileset-ii**
2. Cliquer sur **Download Now** (paiement libre — entrer 0€ ou faire un don)
3. Télécharger l'archive `.zip`
4. Extraire l'archive

### Placement dans le projet

Copier le fichier image principal (généralement `0x72_DungeonTilesetII_v1.7.png` ou similaire)
vers :

```
client/public/tilesets/0x72_dungeon.png
```

> ⚠️ **Le nom du fichier doit être exactement `0x72_dungeon.png`** (en minuscules).
> Phaser charge ce fichier via la clé `"0x72_dungeon"` dans `DungeonScene.ts`.

Un fichier **placeholder transparent 16×16** est fourni à cet emplacement par défaut.
La carte fonctionnera (sans erreur console) avec ce placeholder, mais les tuiles seront invisibles.
Remplacer ce placeholder par le vrai tileset pour un rendu graphique.

---

## 3. Créer un nouveau projet Tiled

1. **Fichier → Nouveau → Nouvelle carte**
2. Remplir les paramètres :
   - **Orientation** : Orthogonale
   - **Format de la couche de tuiles** : CSV (ou Base64 zlib — les deux fonctionnent avec Phaser)
   - **Ordre de rendu** : De droite à gauche, de bas en haut
   - **Largeur de la carte** : 40 cases (ou la taille souhaitée)
   - **Hauteur de la carte** : 40 cases
   - **Largeur des tuiles** : **16 px**
   - **Hauteur des tuiles** : **16 px**
3. Cliquer **OK**

> ⚠️ La taille des tuiles doit toujours être **16×16** pour correspondre au tileset 0x72 Dungeon.

---

## 4. Ajouter le tileset dans Tiled

1. Dans le panneau **Tilesets** (en bas à droite), cliquer sur l'icône **"Nouveau tileset"**
2. Remplir :
   - **Nom** : `0x72_dungeon` ← **respecter ce nom exactement**
   - **Source** : pointer vers `client/public/tilesets/0x72_dungeon.png`
   - **Largeur des tuiles** : 16 px
   - **Hauteur des tuiles** : 16 px
   - **Marge** : 0 / **Espacement** : 0 (sauf si le tileset a des bordures — vérifier visuellement)
3. Cliquer **OK**

> **Équivalent Unity** : C'est comme importer une Sprite Sheet et créer un Tile Palette.

---

## 5. Nommage obligatoire des layers

Les layers **doivent être nommés exactement** comme suit (respecter la casse) :

| Nom du layer | Type Tiled    | Rôle |
|-------------|---------------|------|
| `sol`       | Tile Layer    | Sol en pierre — affiché en dessous de tout |
| `murs`      | Tile Layer    | Murs et obstacles — collision activée côté Phaser |
| `collisions`| Tile Layer    | (Optionnel) Doublon du layer murs pour les collisions explicites |
| `tokens`    | Tile Layer    | Réservé au placement des tokens Phaser — laisser vide |

> **Équivalent Unity** : Ce sont les Sorting Layers du Tilemap Unity.

Créer les layers dans le panneau **Couches** (en haut à droite) :
- Clic droit → **Ajouter une couche de tuiles**
- Double-cliquer sur le nom pour le renommer

---

## 6. Marquer les tuiles de collision

### Méthode recommandée — via `setCollisionByExclusion` (côté Phaser)

C'est la méthode utilisée par défaut dans `DungeonScene.ts` :

```typescript
murLayer.setCollisionByExclusion([-1]);
// Toutes les tuiles NON vides du layer "murs" deviennent des colliders
```

Dans Tiled, il suffit de **placer des tuiles** sur le layer `murs` là où il doit y avoir un mur.
Phaser détecte automatiquement toute tuile ≠ -1 (vide) comme collidable.

### Méthode alternative — propriété `collides` sur les tuiles

Pour un contrôle plus fin (certaines tuiles du layer murs sont traversables) :

1. Dans Tiled, sélectionner le tileset dans le panneau **Tilesets**
2. Cliquer sur **Modifier le tileset** (icône crayon)
3. Sélectionner une tuile mur → panneau **Propriétés** → ajouter :
   - Nom : `collides` — Type : `bool` — Valeur : `true`
4. Côté Phaser, remplacer par :
   ```typescript
   murLayer.setCollisionByProperty({ collides: true });
   ```

---

## 7. Exporter en JSON Tiled

1. **Fichier → Exporter en… → JSON** (ou raccourci **Ctrl+Maj+E**)
2. Naviguer vers `client/public/maps/`
3. Nommer le fichier : `nom-de-la-map.json` (minuscules, tirets) — **remplacer `nom-de-la-map` par l'identifiant de votre map**
4. Cliquer **Exporter**

> ⚠️ Utiliser **Exporter** et non **Enregistrer sous** — Tiled sauvegarde au format `.tmx` par défaut.
> Phaser attend un fichier `.json`.

---

## 8. Référencer la map dans `maps/index.json`

Ouvrir `client/public/maps/index.json` et ajouter une entrée dans le tableau `maps` :

```json
{
  "_comment": "Ajouter le nom (sans .json) de chaque nouvelle map ici",
  "maps": [
    {
      "id": "grande-salle",
      "label": "Grande Salle",
      "description": "Salle ouverte 40×40 cases — map de test Phase 1a"
    },
    {
      "id": "nom-de-la-map",
      "label": "Nom Affiché",
      "description": "Description courte de la map"
    }
  ],
  "defaultMap": "grande-salle"
}
```

Le champ `id` doit correspondre au nom du fichier JSON **sans l'extension `.json`**.

---

## 9. Charger la map dans `DungeonScene.ts`

Pour changer la map chargée au démarrage, modifier dans `DungeonScene.ts` :

```typescript
// Remplacer "nom-de-la-map" par l'id de votre map (correspond au nom du fichier sans .json)
preload(): void {
  this.load.image("0x72_dungeon", "tilesets/0x72_dungeon.png");
  this.load.tilemapTiledJSON("nom-de-la-map", "maps/nom-de-la-map.json");
}

create(): void {
  const map = this.make.tilemap({ key: "nom-de-la-map" });
  // ...
}
```

> **Phase 1b** introduira un sélecteur de map GM dynamique (message `LOAD_MAP` Colyseus)
> qui chargera automatiquement la map choisie depuis `maps/index.json`.

---

## 10. Distribuer la map aux joueurs

### Via Git (méthode recommandée)

```bash
git add client/public/maps/nom-de-la-map.json
git add client/public/maps/index.json
git commit -m "feat: ajout map nom-de-la-map"
git push
```

Les joueurs récupèrent la mise à jour avec `git pull`.

### Partage direct du fichier JSON

Envoyer le fichier `.json` au GM qui le place dans `client/public/maps/`.
Penser à mettre à jour `maps/index.json` également.

> Le fichier JSON est léger (quelques Ko à quelques dizaines de Ko selon la taille de la map).

---

## 💡 Conseils de design

### Bordure de 2 cases de murs

Laisser toujours une **bordure de 2 cases de murs** sur le périmètre de la map.
Cela évite que les tokens sortent de la carte et donne un aspect "encadré" à la salle.

```
┌──────────────────┐  ← 2 cases de murs
│  ██████████████  │
│  █            █  │
│  █   Salle    █  │
│  █            █  │
│  ██████████████  │
└──────────────────┘
```

### Zones de spawn des tokens

Prévoir des cases libres (sans murs) au centre ou en zone neutre pour le spawn initial des tokens.
Le spawn par défaut de `DungeonScene.ts` place les tokens à `(tileX=1, tileY=1)` — s'assurer
que cette case est accessible (pas un mur).

### Taille de map recommandée

| Usage | Taille conseillée |
|-------|------------------|
| Test / petite salle | 20×20 cases |
| Salle standard | 40×40 cases |
| Grande map (donjon) | 80×60 cases |
| Map très grande | > 100×100 (attention aux perfs) |

### Performance

Phaser gère très bien les maps de 100×100 cases avec 2-3 layers.
Au-delà de 200×200 cases, considérer le mode `infinite` de Tiled + chargement par chunks (Phase 7+).
