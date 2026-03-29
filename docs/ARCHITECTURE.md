# 🏗️ Architecture — TableTopeke

## Schéma général

```
┌─────────────────────────────────────────────────────────────────┐
│                        RÉSEAU LOCAL (ou Internet)                │
│                                                                  │
│  [Joueur 1 - Browser]  ──┐                                      │
│  [Joueur 2 - Browser]  ──┤                                      │
│  [Joueur 3 - Browser]  ──┼── WebSocket (ws://) ──▶ ┌─────────┐ │
│  [Joueur 4 - Browser]  ──┤                          │Colyseus │ │
│  [GM       - Browser]  ──┘                          │ Server  │ │
│                                                     │(Node.js)│ │
│  Chaque client = Phaser 3                           │GameRoom │ │
│  dans le navigateur                                 │  .ts    │ │
│  (aucune installation)                              └─────────┘ │
│                                                          ▲       │
│                                              PC du GM   │       │
│                                              start.bat  │       │
└─────────────────────────────────────────────────────────────────┘
```

### Principe de fonctionnement

1. **Le GM lance le serveur** via `start.bat` / `start.sh` sur son PC
2. **Les joueurs ouvrent leur navigateur** et accèdent à l'URL fournie par le GM
3. **Le serveur est la source de vérité** — aucun client ne modifie l'état directement
4. **Colyseus envoie uniquement les deltas** (changements d'état) à chaque tick, minimisant la bande passante

---

## Structure des dossiers

```
TableTopeke/
├── server/                      # Serveur Colyseus (Node.js + TypeScript)
│   ├── src/
│   │   ├── rooms/
│   │   │   └── GameRoom.ts      # Room principale, logique de jeu
│   │   ├── schemas/
│   │   │   ├── DungeonState.ts  # État global de la room
│   │   │   ├── Token.ts         # Schéma d'un token (joueur/ennemi)
│   │   │   └── Player.ts        # Schéma d'un joueur connecté
│   │   └── index.ts             # Point d'entrée du serveur
│   ├── package.json
│   └── tsconfig.json
│
├── client/                      # Frontend Phaser 3 (TypeScript + Vite)
│   ├── src/
│   │   ├── scenes/
│   │   │   ├── BootScene.ts     # Chargement initial (assets, index maps/images)
│   │   │   ├── LobbyScene.ts    # Connexion Colyseus
│   │   │   ├── DungeonScene.ts  # Scène principale (carte Tiled ou image-map, tokens)
│   │   │   └── MapEditorScene.ts # Éditeur de map par images (GM only, Phase 1c)
│   │   ├── network/
│   │   │   └── ColyseusClient.ts # Connexion et gestion des messages
│   │   ├── ui/
│   │   │   ├── GMPanel.ts       # Panneau GM HTML overlay
│   │   │   └── ImagePalette.ts  # Palette d'images HTML (MapEditorScene, Phase 1c)
│   │   ├── types/
│   │   │   └── MapTypes.ts      # Types partagés : PlacedImage, ImageMapData, MapIndex
│   │   └── main.ts              # Point d'entrée Phaser + window.__phaserGame
│   └── public/
│       ├── maps/                # Cartes exportées depuis Tiled ou éditeur (JSON)
│       │   ├── index.json       # Index des maps disponibles (sélecteur GM)
│       │   └── grande-salle.json # Map de test Phase 1a (40×40 cases)
│       ├── images/              # Images PNG pour l'éditeur de map (Phase 1c)
│       │   ├── index.json       # Registre des images disponibles dans la palette
│       │   ├── salle-principale.png
│       │   ├── couloir-horizontal.png
│       │   └── salle-secondaire.png
│       └── tilesets/            # Tilesets graphiques
│           └── 0x72_dungeon.png # Tileset 0x72 Dungeon (16×16 px par tuile)
│
├── docs/                        # Documentation
│   ├── ROADMAP.md
│   ├── ARCHITECTURE.md
│   ├── INSTALL.md
│   ├── GAMEPLAY.md
│   ├── TILED_GUIDE.md           # Guide créateur de maps Tiled
│   └── MAP_EDITOR_GUIDE.md      # Guide éditeur de map par images (Phase 1c)
│
├── start.bat                    # Lancement Windows (Option A)
├── start.sh                     # Lancement Mac/Linux (Option A)
├── README.md
└── CHANGELOG.md
```

---

## Flux de données

### 1. Connexion d'un joueur

```
Client                          Serveur (GameRoom)
  │                                    │
  ├─── WebSocket connect ─────────────▶│
  │                                    ├─ onAuth() : vérif mot de passe GM
  ├─── { name, color, isGM, ... } ────▶│
  │                                    ├─ onJoin() : création du Player schema
  │◀─── État initial complet ──────────┤
  │     (DungeonState sérialisé)       │
  │                                    │
```

### 2. Déplacement d'un token (delta sync)

```
Client (GM ou propriétaire du token)   Serveur          Autres clients
  │                                       │                    │
  ├── Message MOVE_TOKEN ────────────────▶│                    │
  │   { tokenId, x, y }                  ├─ Validation droits  │
  │                                      ├─ Mise à jour State  │
  │                                      ├─ Delta calculé ────▶│ (binaire)
  │◀─────────────────────────────────────┤ Confirmation        │
  │                                      │              ┌──────┤
  │                                      │              │ Interpolation
  │                                      │              └──────▶ Token bouge
```

### 3. Tick serveur (5 ticks/seconde minimum)

```
Colyseus patch cycle :
  1. Accumulation des mutations d'état
  2. Calcul du delta (JSONPatch binaire)
  3. Broadcast du delta à tous les clients de la room
  4. Les clients appliquent le patch sur leur état local
```

---

## Système de rôles

### Game Master

```typescript
// Authentification GM à la connexion
onAuth(client, options) {
  if (options.isGM && options.gmPassword === process.env.GM_PASSWORD) {
    return { isGM: true };
  }
  return { isGM: false };
}
```

| Droit | GM | Joueur |
|-------|----|--------|
| Déplacer son token | ✅ | ✅ |
| Déplacer tous les tokens | ✅ | ❌ |
| Modifier les HP | ✅ | ❌ |
| Activer/désactiver le Fog | ✅ | ❌ |
| Révéler des zones | ✅ | ❌ |
| Gérer l'initiative | ✅ | ❌ |
| Voir toute la carte | ✅ | ❌ (FoW) |

---

## Correspondance Unity/C# → Stack Web

Pour un développeur Unity/C#, voici les équivalents conceptuels :

| Unity / C# | Équivalent TableTopeke | Fichier |
|------------|----------------------|---------|
| `MonoBehaviour.Update()` | `scene.update()` Phaser | `GameScene.ts` |
| `NetworkTransform` (Mirror/Netcode) | Colyseus Schema + interpolation | `TokenSprite.ts` |
| `[SyncVar]` | `@type()` decorator Colyseus | `Token.ts` |
| `PhotonNetwork.IsMasterClient` | `player.isGM` | `GameRoom.ts` |
| `ScriptableObject` | JSON config joueur | `player-config.json` |
| `Tilemap` component | `this.make.tilemap()` Phaser | `GameScene.ts` |
| `Camera.main` | `this.cameras.main` Phaser | `GameScene.ts` |
| `Physics.Raycast()` | Algorithme raycasting grille | `FogOfWarSystem.ts` |
| `Canvas` / `UI Toolkit` | Scène Phaser dédiée UI | `UIScene.ts` |
| `NavMesh` / `A*` | Pathfinding A* plugin Phaser | Phase 3+ |

> **Note** : TypeScript est suffisamment proche de C# pour que la courbe d'apprentissage soit douce. Les types, classes, interfaces, génériques — les concepts sont identiques.

---

## Extensibilité — Options A → B → C

### Option A (actuelle) — Lancement local

```
PC du GM
├── Node.js installé
├── start.bat → npm start
└── URL locale partagée aux joueurs
```

### Option B — Exécutable standalone (prévu Phase 6)

```
PC du GM
├── server.exe (Node.js + Colyseus bundlé avec pkg)
└── Double-clic → serveur lancé (sans installer Node.js)
```

Commande de build :
```bash
pkg server/dist/index.js --target node18-win-x64 --output server.exe
```

### Option C — Déploiement cloud (optionnel Phase 6)

```
Render.com / Railway.app
├── Déploiement continu depuis GitHub
├── URL fixe accessible 24h/24
└── Les joueurs accèdent sans que le GM soit en ligne
```

> Le code source ne change pas entre les options A, B et C. Seule la façon de démarrer le serveur diffère.

---

## Gestion des maps

### Flux de création et chargement

```
Tiled Map Editor (externe)
  │
  ├─ Créer la map (layers: sol, murs, tokens)
  ├─ Référencer le tileset 0x72_dungeon
  ├─ Exporter en JSON → client/public/maps/nom-de-la-map.json
  │
  └─ Ajouter l'entrée dans maps/index.json
        │
        ▼
  Phaser (DungeonScene.ts)
  │
  ├─ preload() → load.tilemapTiledJSON("clé", "maps/nom.json")
  ├─ create()  → make.tilemap({ key: "clé" })
  │              addTilesetImage("0x72_dungeon", "0x72_dungeon")
  │              createLayer("sol",  tileset, 0, 0)
  │              createLayer("murs", tileset, 0, 0)
  │              murLayer.setCollisionByExclusion([-1])
  │
  └─ Tokens Phaser placés sur le layer "tokens" (coordonnées tileX/tileY × TILE_SIZE)
```

### Layers obligatoires

| Nom du layer | Type        | Rôle |
|-------------|-------------|------|
| `sol`       | Tile Layer  | Sol en pierre — rendu en dessous de tout (depth 0) |
| `murs`      | Tile Layer  | Murs et obstacles — collisions activées (`setCollisionByExclusion`) |
| `tokens`    | Tile Layer  | Réservé au placement des tokens Phaser — laisser vide dans Tiled |

> **Respecter la casse** : Phaser recherche les layers par nom exact.

### Rôle de `maps/index.json`

`client/public/maps/index.json` est l'inventaire des maps disponibles dans la session.

```json
{
  "maps": [
    { "id": "grande-salle", "label": "Grande Salle", "description": "..." }
  ],
  "defaultMap": "grande-salle"
}
```

- `id` correspond au nom du fichier JSON sans extension
- Ce fichier sera lu par le sélecteur de map GM (Phase 1b)
- Ajouter une entrée ici pour chaque nouvelle map créée dans Tiled

### Message `LOAD_MAP` (Phase 1b — Implémenté)

Le GM peut changer de map en cours de session depuis le panel HTML overlay :

```
GM (navigateur)           Serveur (Colyseus)        Joueurs (navigateurs)
  │                              │                         │
  ├─ LOAD_MAP { mapName } ──────▶│                         │
  │                              ├─ Validation droits GM   │
  │                              ├─ state.currentMap = ... │
  │                              ├─ tokens → tileX/Y = 20  │
  │                              ├─ Delta broadcast ──────▶│
  │                              │                   ┌─────┤
  │                              │                   │ DungeonScene
  │                              │                   │ state.listen("currentMap")
  │                              │                   │ → _loadMap(newMap)
  │                              │                   │ → destroy anciens layers
  │                              │                   │ → make.tilemap({ key })
  │                              │                   │ → createLayer sol/murs
  │                              │                   └─────▶ Map affichée
```

Flux complet :
1. GM sélectionne dans le panel → `network.loadMap(mapName)`
2. Message `LOAD_MAP { mapName }` envoyé au serveur
3. Serveur valide le rôle GM, met à jour `state.currentMap`, repositionne les tokens
4. Colyseus delta broadcast → tous les clients reçoivent le changement
5. Chaque client écoute `state.listen("currentMap")` → `DungeonScene._loadMap()` rechargée

---

## Types de maps (Phase 1c)

`DungeonScene` supporte deux formats de maps discriminés par le champ `type` dans `maps/index.json` :

### `tiled` — Map Tiled JSON classique (défaut)

- Créée avec **Tiled Map Editor** (outil externe)
- Layers obligatoires : `sol`, `murs` (avec collisions)
- Tileset : `0x72_dungeon.png` (16×16 px/tuile)
- Chargement via `this.make.tilemap()` + `createLayer()`

### `image-map` — Map composée d'images PNG

- Créée avec l'**éditeur de map intégré** (`MapEditorScene`)
- Composée de `PlacedImage` positionnées sur une grille 64 px/case
- Images sources dans `client/public/images/`
- Format JSON généré par l'éditeur (téléchargement navigateur)
- Chargement via `fetch()` + `this.add.image()` dynamique

### Discriminant dans `maps/index.json`

```json
{
  "maps": [
    { "id": "grande-salle", "label": "Grande Salle",  "type": "tiled"     },
    { "id": "ma-map",       "label": "Ma Map Custom", "type": "image-map" }
  ],
  "defaultMap": "grande-salle"
}
```

> Si `type` est absent, `DungeonScene` suppose `"tiled"` (rétrocompatibilité avec les maps existantes).

### Types TypeScript (`client/src/types/MapTypes.ts`)

| Interface | Description |
|-----------|-------------|
| `PlacedImage` | Une image positionnée sur la grille (id, src, x, y, widthInTiles, heightInTiles) |
| `ImageMapData` | Format JSON complet d'une image-map (`type: "image-map"`) |
| `MapIndexEntry` | Entrée de `maps/index.json` avec champ `type` optionnel |
| `MapIndex` | Format complet de `maps/index.json` |

---

## Notes de performance

| Paramètre | Valeur cible | Détail |
|-----------|-------------|--------|
| Tick rate | 5–20 ticks/s | Configurable dans `GameRoom.ts` (`setPatchRate`) |
| Latence réseau | < 50ms LAN | WebSocket natif, delta binaire |
| Joueurs simultanés | 5 | Largement dans les capacités de Colyseus sur un PC |
| Taille du delta | < 1 KB/tick | Schema Colyseus optimisé, pas de JSON complet |
| Interpolation | 200ms | Lissage côté client entre les ticks |
