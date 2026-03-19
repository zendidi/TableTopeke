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
│   │   │   ├── GameScene.ts     # Scène principale (carte, tokens, caméra)
│   │   │   └── UIScene.ts       # Scène UI (HUD, panneau GM, initiative)
│   │   ├── network/
│   │   │   └── ColyseusClient.ts # Connexion et gestion des messages
│   │   ├── objects/
│   │   │   └── TokenSprite.ts   # Classe sprite de token avec interpolation
│   │   └── main.ts              # Point d'entrée Phaser
│   ├── assets/
│   │   ├── maps/                # Cartes exportées depuis Tiled (JSON)
│   │   └── tilesets/            # Tilesets graphiques (LPC Dungeon)
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                        # Documentation (ce répertoire)
│   ├── ROADMAP.md
│   ├── ARCHITECTURE.md
│   ├── INSTALL.md
│   └── GAMEPLAY.md
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

## Notes de performance

| Paramètre | Valeur cible | Détail |
|-----------|-------------|--------|
| Tick rate | 5–20 ticks/s | Configurable dans `GameRoom.ts` (`setPatchRate`) |
| Latence réseau | < 50ms LAN | WebSocket natif, delta binaire |
| Joueurs simultanés | 5 | Largement dans les capacités de Colyseus sur un PC |
| Taille du delta | < 1 KB/tick | Schema Colyseus optimisé, pas de JSON complet |
| Interpolation | 200ms | Lissage côté client entre les ticks |
