# 🔍 Review — TableTopeke

**Date :** 2026-04-10  
**Scope :** Phases 0 → 2b + scaffolding tests (Phase 3 hors périmètre)

---

## Résumé exécutif

Le scaffold est solide et l'architecture est cohérente. Plusieurs fonctionnalités marquées ✅ dans la ROADMAP ne fonctionnent **pas** telles que documentées. Les problèmes vont du silencieusement cassé (auth GM, déplacement GM) à l'entièrement absent (FoW visuel, indicateur de combat). Ce document les classe par criticité.

---

## 📋 Récapitulatif

| # | Sévérité | Statut | Fichier(s) concerné(s) | Problème |
|---|----------|--------|------------------------|----------|
| 1 | 🔴 Critique | ✅ Corrigé | `DungeonRoom.ts:6`, `player-config.GM.json` | GM_PASSWORD server `"admin"` ≠ config `"master1234"` |
| 2 | 🔴 Critique | ✅ Corrigé | `ColyseusClient.ts:52` | `isGM` client ignorant l'auth serveur |
| 3 | 🔴 Critique | ✅ Corrigé | `DungeonScene.ts:542` | GM ne peut pas déplacer les tokens des autres |
| 4 | 🔴 Critique | ✅ Corrigé | `player-config.json` | Config par défaut `isGM:true` sans password |
| 5 | 🟠 Important | 🔖 Backlog | `DungeonScene.ts` | FoW sans aucun effet visuel |
| 6 | 🟠 Important | 🔖 Backlog | `DungeonScene.ts` | Combat sans indicateur visuel |
| 7 | 🟠 Important | 🔖 Backlog | `DungeonRoom.ts:104` | `currentTurnId` jamais avancé |
| 8 | 🟠 Important | ✅ Corrigé | `MapEditorScene.ts:258` | Coordonnées monde incorrectes (Scale.FIT) |
| 9 | 🟠 Important | ✅ Corrigé | `DebugPanel.ts:126` | Fuite mémoire listener keydown |
| 10 | 🟡 Mineur | ✅ Corrigé | `maps/index.json`, `DungeonState.ts` | `grande-salle` non indexée, `currentMap` incohérent |
| 11 | 🟡 Mineur | 🔖 Backlog | `DungeonScene.ts:479` | Barre HP absente (texte seulement) |
| 12 | 🟡 Mineur | 🔖 Backlog | `DungeonScene.ts` | Token "hors combat" sans visuel |
| 13 | 🟡 Mineur | ✅ Corrigé | `ColyseusClient.ts:6` | `DEBUG_NETWORK` toujours `true` |
| 14 | 🟡 Mineur | ✅ Corrigé | `server/src/rooms/` | Fichier test en double |
| 15 | 🟡 Mineur | 🔖 Backlog | `DungeonScene.ts:307` | `load.once("complete")` fragile |

---

## 🔴 Bugs Critiques

### 1. Mot de passe GM — mismatch serveur / config client ✅ Corrigé

**Fichiers :** `server/src/rooms/DungeonRoom.ts:6`, `client/public/player-config.GM.json`

Le serveur utilisait `GM_PASSWORD ?? "admin"` comme mot de passe par défaut. Le fichier `player-config.GM.json` contient `"gmPassword": "master1234"`. Ces deux valeurs ne correspondaient pas.

**Conséquence :** Sans la variable d'env `GM_PASSWORD=master1234`, le GM se connectait avec `isGM: true` côté client (GMPanel visible) mais **toutes ses commandes étaient silencieusement rejetées côté serveur** (`gmSessionId` jamais assigné). `LOAD_MAP`, `UPDATE_HP`, `TOGGLE_FOG`, `COMBAT_ACTION`, `SET_TILE_SCALE` — rien ne fonctionnait.

**Correction appliquée :**
```diff
// server/src/rooms/DungeonRoom.ts:6
- const GM_PASSWORD = process.env.GM_PASSWORD ?? "admin";
+ const GM_PASSWORD = process.env.GM_PASSWORD ?? "master1234";
```

---

### 2. `isGM` déterminé côté client uniquement, jamais vérifié depuis le serveur ✅ Corrigé

**Fichier :** `client/src/network/ColyseusClient.ts:52`

Le client décidait lui-même s'il était GM à partir de sa config locale, sans valider que le serveur l'avait bien authentifié. Même si `onAuth()` retournait `{ isGM: false }`, le client affichait quand même le GMPanel si `player-config.json` contenait `"isGM": true`.

**Correction appliquée :**
```diff
// client/src/network/ColyseusClient.ts
- this.isGM = mergedOptions.isGM === true;
+ // isGM déterminé depuis l'état serveur : si le serveur a enregistré notre sessionId
+ // comme gmSessionId, l'auth a réussi.
+ this.isGM = this.room.state.gmSessionId === this.room.sessionId;
```

---

### 3. Le GM ne peut pas déplacer les tokens des autres joueurs ✅ Corrigé

**Fichier :** `client/src/scenes/DungeonScene.ts`

Le clic sur une case vide envoyait **toujours** le sessionId du joueur courant comme `tokenId`. Le GM pouvait cliquer sur un autre token (affichait le cercle de portée) puis cliquer sur une case — mais le token déplacé était le sien, pas celui qu'il avait "cliqué". Aucun état `selectedTokenId` n'existait.

**Correction appliquée :**
- Ajout de `private selectedTokenId: string | null = null`
- Ajout de `_selectToken(tokenId)` : retire l'outline de l'ancien token, applique un contour blanc (`setStrokeStyle(2, 0xffffff)`) sur le nouveau
- Un clic sur un token sélectionnable (GM → tous, joueur → le sien) appelle `_selectToken`
- Un clic sur une case vide utilise `selectedTokenId ?? network.room.sessionId` comme cible
- `onRemove` désélectionne si le token supprimé était sélectionné

```diff
- network.moveToken(network.room.sessionId, tileX, tileY);
+ const tokenToMove = this.selectedTokenId ?? network.room.sessionId;
+ network.moveToken(tokenToMove, tileX, tileY);
```

---

### 4. Le `player-config.json` par défaut a `isGM: true` sans `gmPassword` ✅ Corrigé

**Fichier :** `client/public/player-config.json`

Le fichier livré par défaut contenait `"isGM": true` mais pas de `gmPassword`. Tous les joueurs utilisant ce fichier voyaient le GMPanel mais ne pouvaient rien faire (combinaison avec bugs #1 et #2).

**Correction appliquée :**
```diff
// client/public/player-config.json
- "isGM": true
+ "isGM": false
```

---

## 🟠 Bugs Importants

### 5. Fog of War — aucun effet visuel côté client 🔖 Backlog (Phase 4)

**Fichier :** `client/src/scenes/DungeonScene.ts`

Le message `TOGGLE_FOG` met bien à jour `state.fogEnabled` / `state.losEnabled` côté serveur. Mais `DungeonScene` ne pose **aucun listener** sur ces champs et ne contient **aucun code de rendu** du brouillard. Les cases à cocher du GMPanel s'envoient au serveur sans effet visuel.

**Statut :** Cohérent avec Phase 4 ⬜. La ROADMAP Phase 2b ne devrait pas marquer le toggle FoW comme ✅ — uniquement l'envoi du message est implémenté.

---

### 6. Combat — aucun indicateur visuel sur le canvas 🔖 Backlog (Phase 3)

**Fichier :** `client/src/scenes/DungeonScene.ts`

`combatActive`, `currentTurn` et `currentTurnId` sont synchronisés correctement par Colyseus, mais `DungeonScene` n'écoute aucun de ces champs. Pas de pulsation dorée sur le token actif, pas d'indicateur de round, pas de mise en évidence dans le GMPanel.

---

### 7. `currentTurnId` jamais mis à jour lors de "next" 🔖 Backlog (Phase 3)

**Fichier :** `server/src/rooms/DungeonRoom.ts:104`

```ts
case "next":
  this.state.currentTurn += 1;
  // currentTurnId n'est pas mis à jour
  break;
```

La logique "qui joue maintenant" n'est pas implémentée. `currentTurnId` reste vide pendant tout le combat. L'initiative tracker (Phase 3) en dépend.

---

### 8. Calcul des coordonnées monde incorrect dans `MapEditorScene` ✅ Corrigé

**Fichier :** `client/src/scenes/MapEditorScene.ts`

Avec `Phaser.Scale.FIT`, le calcul manuel `scrollX + pointer.x / zoom` ignorait le facteur de scaling CSS du canvas. Le placement et la détection de clic étaient décalés dès que la fenêtre n'était pas exactement à 1280×720.

**Correction appliquée** (3 occurrences dans `_setupInput`) :
```diff
- const worldX = this.cameras.main.scrollX + pointer.x / this.cameras.main.zoom;
- const worldY = this.cameras.main.scrollY + pointer.y / this.cameras.main.zoom;
+ // pointer.worldX/worldY gère scroll, zoom ET scaling CSS (Phaser.Scale.FIT)
+ pointer.worldX
+ pointer.worldY
```

---

### 9. Fuite mémoire dans `DebugPanel.destroy()` ✅ Corrigé

**Fichier :** `client/src/ui/DebugPanel.ts`

L'event listener keydown était enregistré comme arrow function anonyme mais `destroy()` tentait de retirer `this._toggle` — une référence différente, sans effet. Le listener persistait après shutdown de la scène.

**Correction appliquée :**
```diff
+ private _boundKeydown: (e: KeyboardEvent) => void;
  
  constructor(...) {
-   window.addEventListener("keydown", (e) => { if (e.key === "`") this._toggle(); });
+   this._boundKeydown = (e: KeyboardEvent) => { if (e.key === "`") this._toggle(); };
+   window.addEventListener("keydown", this._boundKeydown);
  }
  
  destroy() {
-   window.removeEventListener("keydown", this._toggle);
+   window.removeEventListener("keydown", this._boundKeydown);
  }
```

---

## 🟡 Problèmes Mineurs / Qualité

### 10. `grande-salle` absente de `maps/index.json` + `currentMap` incohérent ✅ Corrigé

**Fichiers :** `client/public/maps/index.json`, `server/src/schema/DungeonState.ts`

`grande-salle.json` existait dans `client/public/maps/` mais n'était plus référencée dans l'index (invisible dans le sélecteur GM, non pré-chargée). `DungeonState.currentMap` pointait vers `"salle-images"` tandis que `DEFAULT_MAP_NAME` dans `DungeonScene` pointait vers `"grande-salle"`.

**Correction appliquée :**
- `grande-salle` réintégrée dans `maps/index.json` comme première entrée avec `"type": "tiled"`
- `"defaultMap"` repassé à `"grande-salle"`
- `DungeonState.currentMap` aligné sur `"grande-salle"`

---

### 11. Barre de HP non implémentée — texte uniquement 🔖 Backlog

**Fichier :** `client/src/scenes/DungeonScene.ts:479`

GAMEPLAY.md décrit une barre colorée (verte > 50%, orange 25–50%, rouge < 25%) visible au-dessus des tokens. L'implémentation actuelle affiche uniquement du texte `20/20`. Pas de barre, pas de codage couleur, pas d'état "hors combat" (token grisé à 0 HP).

---

### 12. Tokens "hors combat" (HP = 0) sans visuel 🔖 Backlog

**Fichier :** `client/src/scenes/DungeonScene.ts`

La documentation mentionne un token grisé quand HP = 0. Aucun code ne réagit à `hp === 0` pour modifier l'apparence.

---

### 13. `DEBUG_NETWORK = true` codé en dur ✅ Corrigé

**Fichier :** `client/src/network/ColyseusClient.ts:6`

Tous les messages réseau étaient loggués en console inconditionnellement.

**Correction appliquée :**
```diff
- const DEBUG_NETWORK = true;
+ const DEBUG_NETWORK = import.meta.env.DEV;
```

---

### 14. Fichier test dupliqué ✅ Corrigé

`server/src/rooms/DungeonRoom.test.ts` coexistait avec `server/src/__tests__/DungeonRoom.test.ts`.

**Correction appliquée :** `server/src/rooms/DungeonRoom.test.ts` supprimé. La version canonique est dans `__tests__/`.

---

### 15. `_loadImageMap` : listener `load.once("complete")` fragile 🔖 Backlog

**Fichier :** `client/src/scenes/DungeonScene.ts:307`

```ts
this.load.once("complete", doCreate);
this.load.start();
```

Si des résidus d'événements `complete` d'un cycle précédent subsistent, le callback peut se déclencher au mauvais moment. L'approche via `this.load.on("filecomplete-image-" + textureKey, ...)` est plus robuste mais non bloquante.

---

## Éléments restants en backlog

| # | Sévérité | Problème | Phase cible |
|---|----------|----------|-------------|
| 5 | 🟠 | FoW visuel (listeners + rendu masque) | Phase 4 |
| 6 | 🟠 | Combat visuel (pulsation token actif, indicateur round) | Phase 3 |
| 7 | 🟠 | `currentTurnId` avancé sur "next" (initiative tracker) | Phase 3 |
| 11 | 🟡 | Barre HP colorée + token grisé à 0 HP | Phase 3 |
| 12 | 🟡 | Token "hors combat" (HP = 0) grisé | Phase 3 |
| 15 | 🟡 | `load.once("complete")` → `filecomplete-image-*` | À l'occasion |

---

## 🛠️ Guides d'implémentation — Backlog

---

### Guide #5 — Fog of War visuel (Phase 4)

**Fichiers à modifier :** `server/src/schema/DungeonState.ts`, `server/src/rooms/DungeonRoom.ts`, `client/src/scenes/DungeonScene.ts`, `client/src/ui/GMPanel.ts`

#### Vue d'ensemble

Le FoW se compose de deux systèmes indépendants contrôlés par le même overlay Phaser `Graphics` placé en **depth 9** (au-dessus des layers carte 0–5, en dessous des tokens 10).

| Mode | `fogEnabled` | Principe | Qui voit quoi |
|------|-------------|----------|---------------|
| Révélation globale | `true` | Masque noir sur toute la map, trous poinçonnés sur les zones révélées par le GM | Joueurs : zones révélées seulement. GM : tout. |
| LOS par joueur | `losEnabled` | Masque noir par joueur selon raycasting | Joueurs : cone de vision. GM : tout. |

#### Étape 1 — Ajouter le tracking des zones révélées dans le schéma

```ts
// server/src/schema/DungeonState.ts
import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

// Dans DungeonState :
// Zones révélées par le GM : clés au format "tileX_tileY" (ex: "5_3")
// Une MapSchema<boolean> permet un delta minimal (seules les zones modifiées sont broadcastées)
@type({ map: "boolean" }) revealedZones = new MapSchema<boolean>();
```

#### Étape 2 — Ajouter le message `REVEAL_ZONE` côté serveur

```ts
// server/src/rooms/DungeonRoom.ts — dans onCreate()
this.onMessage("REVEAL_ZONE", (client, data: { tileX: number; tileY: number; revealed: boolean }) => {
  if (client.sessionId !== this.state.gmSessionId) return;
  const key = `${data.tileX}_${data.tileY}`;
  if (data.revealed) {
    this.state.revealedZones.set(key, true);
  } else {
    this.state.revealedZones.delete(key);
  }
});

// Vider les zones révélées lors d'un changement de map
// (dans le handler LOAD_MAP, après le repositionnement des tokens)
this.state.revealedZones.clear();
```

#### Étape 3 — Ajouter `REVEAL_ZONE` dans `ColyseusClient.ts`

```ts
revealZone(tileX: number, tileY: number, revealed: boolean): void {
  this.room.send("REVEAL_ZONE", { tileX, tileY, revealed });
}
```

#### Étape 4 — Rendu du masque dans `DungeonScene`

```ts
// Nouveaux champs
private fogOverlay: Phaser.GameObjects.Graphics | null = null;
private mapWidthPx: number = 0;   // mis à jour dans _loadTiledMap / _loadImageMap
private mapHeightPx: number = 0;

// Dans create(), après _syncTokens() :
network.room.state.listen("fogEnabled", () => this._refreshFogOverlay());
network.room.state.listen("losEnabled", () => this._refreshFogOverlay());
network.room.state.revealedZones.onAdd(() => this._refreshFogOverlay());
network.room.state.revealedZones.onRemove(() => this._refreshFogOverlay());

// Appeler aussi _refreshFogOverlay() à la fin de _loadTiledMap() et _loadImageMap()

private _refreshFogOverlay(): void {
  // Le GM voit toujours tout
  if (network.isGM) return;

  const { fogEnabled } = network.room.state;

  if (!fogEnabled) {
    this.fogOverlay?.setVisible(false);
    return;
  }

  if (!this.fogOverlay) {
    this.fogOverlay = this.add.graphics().setDepth(9);
  }

  this.fogOverlay.clear();
  // Masque noir sur toute la map
  this.fogOverlay.fillStyle(0x000000, 0.85);
  this.fogOverlay.fillRect(0, 0, this.mapWidthPx, this.mapHeightPx);

  // Poinçonner les zones révélées (effacement par dessin transparent)
  // Phaser ne supporte pas le "erase" natif sur Graphics — utiliser un RenderTexture
  // pour un vrai masque. Pour un MVP, dessiner les zones révélées en couleur de fond :
  this.fogOverlay.fillStyle(0x000000, 0); // transparent
  network.room.state.revealedZones.forEach((_val, key) => {
    const [tx, ty] = key.split("_").map(Number);
    this.fogOverlay!.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  });

  this.fogOverlay.setVisible(true);
}
```

> **Note MVP vs. production :** L'approche Graphics ne supporte pas le vrai perçage (alpha composite). Pour un masque propre, utiliser un `Phaser.GameObjects.RenderTexture` avec `BlendMode.ERASE`. C'est l'étape suivante une fois le flux de données validé.

#### Étape 5 — Outil de révélation dans `GMPanel`

Ajouter un bouton "🖊️ Révéler / Cacher" dans la section FoW. Au clic, passer `DungeonScene` en mode "révélation" : le prochain clic gauche sur la carte appelle `network.revealZone(tileX, tileY, true)` au lieu de déplacer un token.

---

### Guide #6 — Indicateurs visuels de combat (Phase 3)

**Fichiers à modifier :** `client/src/scenes/DungeonScene.ts`, `client/src/ui/GMPanel.ts`

#### Étape 1 — Écouter les champs de combat dans `DungeonScene.create()`

```ts
// Après _syncTokens(), dans create() :
network.room.state.listen("combatActive", (active: boolean) => {
  if (!active) this._clearCombatEffects();
});

network.room.state.listen("currentTurnId", (turnId: string) => {
  this._highlightActiveCombatant(turnId);
});

network.room.state.listen("currentTurn", (turn: number) => {
  this.gmPanel?.updateCombatRound(turn);
});
```

#### Étape 2 — Ajouter les champs et méthodes dans `DungeonScene`

```ts
// Nouveau champ
private activeTurnTween: Phaser.Tweens.Tween | null = null;

private _highlightActiveCombatant(tokenId: string): void {
  // Stopper l'ancien tween
  this.activeTurnTween?.stop();
  this.activeTurnTween = null;

  // Retirer le highlight de tous les tokens
  this.tokenSprites.forEach((container) => {
    (container.getAt(0) as Phaser.GameObjects.Arc).setStrokeStyle(0);
  });

  if (!tokenId) return;

  const container = this.tokenSprites.get(tokenId);
  if (!container) return;

  const circle = container.getAt(0) as Phaser.GameObjects.Arc;

  // Pulsation dorée via tween sur le strokeWidth
  circle.setStrokeStyle(3, 0xffd700, 1);
  this.activeTurnTween = this.tweens.add({
    targets:    circle,
    strokeAlpha: { from: 1, to: 0.2 },
    duration:   600,
    yoyo:       true,
    repeat:     -1,
    ease:       "Sine.easeInOut",
  });
}

private _clearCombatEffects(): void {
  this.activeTurnTween?.stop();
  this.activeTurnTween = null;
  this.tokenSprites.forEach((container) => {
    (container.getAt(0) as Phaser.GameObjects.Arc).setStrokeStyle(0);
  });
}
```

> **Note :** `strokeAlpha` est une propriété custom sur `Arc`. Phaser ne tween pas directement les propriétés de stroke. Alternative : tweener `container.alpha` ou utiliser `container.scale` pour une pulsation de taille.
>
> **Alternative plus simple et garantie :** tweener `container.scale` entre `1.0` et `1.2`, ce qui est directement supporté par Phaser.

```ts
// Remplacer le tween par :
this.activeTurnTween = this.tweens.add({
  targets:  container,
  scaleX:   { from: 1.0, to: 1.2 },
  scaleY:   { from: 1.0, to: 1.2 },
  duration: 600,
  yoyo:     true,
  repeat:   -1,
  ease:     "Sine.easeInOut",
});
```

#### Étape 3 — Afficher le round dans `GMPanel`

```ts
// Dans GMPanel, ajouter dans _buildCombatSection() un label round :
const roundLabel = document.createElement("div");
roundLabel.id    = "gm-combat-round";
roundLabel.textContent = "Round : —";
Object.assign(roundLabel.style, { fontSize: "11px", color: "#aaaaaa", marginTop: "4px" });
wrapper.appendChild(roundLabel);

// Nouvelle méthode publique :
updateCombatRound(round: number): void {
  const el = document.getElementById("gm-combat-round");
  if (el) el.textContent = round > 0 ? `Round : ${round}` : "Round : —";
}
```

---

### Guide #7 — Initiative tracker : `currentTurnId` avancé sur "next" (Phase 3)

**Fichiers à modifier :** `server/src/schema/DungeonState.ts`, `server/src/rooms/DungeonRoom.ts`, `client/src/ui/GMPanel.ts`, `client/src/network/ColyseusClient.ts`

#### Étape 1 — Ajouter `initiativeOrder` dans le schéma

```ts
// server/src/schema/DungeonState.ts
import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

// Dans DungeonState :
// Ordre d'initiative : tableau des tokenId dans l'ordre de passage
@type(["string"]) initiativeOrder = new ArraySchema<string>();
```

#### Étape 2 — Ajouter le message `SET_INITIATIVE` côté serveur

```ts
// server/src/rooms/DungeonRoom.ts — dans onCreate()
this.onMessage("SET_INITIATIVE", (client, data: { order: string[] }) => {
  if (client.sessionId !== this.state.gmSessionId) return;
  if (!Array.isArray(data.order)) return;

  this.state.initiativeOrder.clear();
  data.order.forEach((tokenId) => this.state.initiativeOrder.push(tokenId));
});
```

#### Étape 3 — Mettre à jour `COMBAT_ACTION "start"` et `"next"`

```ts
case "start":
  this.state.combatActive  = true;
  this.state.currentTurn   = 1;
  // Premier combattant = tête de l'ordre d'initiative
  this.state.currentTurnId = this.state.initiativeOrder[0] ?? "";
  break;

case "next": {
  if (!this.state.combatActive) return;
  this.state.currentTurn += 1;
  const order = this.state.initiativeOrder;
  if (order.length > 0) {
    const idx     = order.indexOf(this.state.currentTurnId);
    const nextIdx = (idx + 1) % order.length;
    this.state.currentTurnId = order[nextIdx];
  }
  break;
}

case "end":
  this.state.combatActive  = false;
  this.state.currentTurn   = 0;
  this.state.currentTurnId = "";
  this.state.initiativeOrder.clear();
  break;
```

#### Étape 4 — Interface GM : saisie de l'ordre d'initiative

Dans `GMPanel._buildCombatSection()`, ajouter une liste triable des joueurs connectés avec leur score d'initiative (input number par joueur). Au clic "Démarrer" :

1. Lire les scores saisis
2. Trier les tokenId par score décroissant
3. Appeler `network.setInitiative(sortedIds)` puis `network.combat("start")`

```ts
// ColyseusClient.ts
setInitiative(order: string[]): void {
  this.room.send("SET_INITIATIVE", { order });
}
```

---

### Guide #11 + #12 — Barre HP colorée + token "hors combat" grisé (Phase 3)

**Fichier à modifier :** `client/src/scenes/DungeonScene.ts`

Ces deux fonctionnalités s'implémentent dans `_createTokenSprite()` et dans le listener `hp` de `_syncTokens()`.

#### Structure actuelle du container (indices fixes)

| Index | Objet | Type |
|-------|-------|------|
| 0 | Cercle coloré | `Phaser.GameObjects.Arc` |
| 1 | Label nom | `Phaser.GameObjects.Text` |
| 2 | Label HP texte | `Phaser.GameObjects.Text` |

#### Nouvelle structure cible

| Index | Objet | Type |
|-------|-------|------|
| 0 | Cercle coloré | `Phaser.GameObjects.Arc` |
| 1 | Label nom | `Phaser.GameObjects.Text` |
| 2 | Barre HP (Graphics) | `Phaser.GameObjects.Graphics` |

Le label texte `hpLabel` est supprimé — les HP sont lisibles dans le GMPanel. Garder uniquement la barre visuelle sur le token allège l'affichage.

#### Remplacer `hpLabel` par `hpBar` dans `_createTokenSprite()`

```ts
// Remplacer le bloc hpLabel par :
const BAR_W = TILE_SIZE * 0.8;
const BAR_H = 3;
const BAR_Y = TILE_SIZE * 0.55;

const hpBar = this.add.graphics();
hpBar.setPosition(-BAR_W / 2, BAR_Y);
this._drawHpBar(hpBar, token.hp, token.hpMax, BAR_W, BAR_H);

const container = this.add.container(x, y, [circle, nameLabel, hpBar]);
```

#### Ajouter la méthode helper `_drawHpBar()`

```ts
private _drawHpBar(
  g: Phaser.GameObjects.Graphics,
  hp: number,
  hpMax: number,
  barW: number,
  barH: number,
): void {
  g.clear();

  // Fond sombre
  g.fillStyle(0x222222, 0.8);
  g.fillRect(0, 0, barW, barH);

  const ratio = hpMax > 0 ? Math.max(0, hp / hpMax) : 0;
  // Couleur selon le pourcentage de HP restants
  const color = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xffaa00 : 0xcc2222;

  g.fillStyle(color, 1);
  g.fillRect(0, 0, barW * ratio, barH);
}
```

#### Mettre à jour le listener `hp` dans `_syncTokens()`

```ts
// Remplacer le listener hp existant par :
token.listen("hp", (newHp: number) => {
  const container = this.tokenSprites.get(tokenId);
  if (!container) return;

  const circle = container.getAt(0) as Phaser.GameObjects.Arc;
  const hpBar  = container.getAt(2) as Phaser.GameObjects.Graphics;

  const BAR_W = TILE_SIZE * 0.8;
  this._drawHpBar(hpBar, newHp, token.hpMax, BAR_W, 3);

  // Token "hors combat" : grisé à 0 HP, restauré au-dessus de 0
  if (newHp <= 0) {
    circle.setFillStyle(0x555555, 0.4);
  } else {
    const color = Phaser.Display.Color.HexStringToColor(token.color ?? "#ffffff").color;
    circle.setFillStyle(color, 1);
  }
});
```

> **Compatibilité avec `_selectToken()`** : `_selectToken()` accède à `container.getAt(0)` (le cercle) — aucun changement d'indice, compatible.

---

### Guide #15 — Remplacer `load.once("complete")` par `filecomplete-image-*`

**Fichiers à modifier :** `client/src/scenes/DungeonScene.ts`, `client/src/scenes/MapEditorScene.ts`

#### Problème

`load.once("complete")` se déclenche quand **tous** les assets en attente ont fini de charger, pas spécifiquement celui qu'on vient d'enqueuer. Si un autre chargement est en cours en parallèle, le callback peut s'exécuter trop tôt ou pour le mauvais asset.

#### Correction — même pattern dans les deux fichiers

```ts
// Avant (fragile) :
this.load.image(textureKey, src);
this.load.once("complete", doCreate);
this.load.start();

// Après (robuste) :
this.load.image(textureKey, src);
this.load.once(`filecomplete-image-${textureKey}`, doCreate);
this.load.start();
```

L'événement `filecomplete-image-{key}` est émis par Phaser exactement quand cette texture précise est chargée, indépendamment des autres loads en cours.

**Occurrences à corriger :**
- `DungeonScene.ts` — méthode `_loadImageMap()` (~ligne 307)
- `MapEditorScene.ts` — méthode `_renderPlacedImage()` (~ligne 438)
