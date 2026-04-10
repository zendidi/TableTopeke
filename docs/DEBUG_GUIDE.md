# 🐛 Guide de débogage — TableTopeke

## Outils disponibles

TableTopeke dispose de trois outils de débogage complémentaires :

1. **DebugPanel client** — overlay in-game, activé avec la touche `` ` `` (backtick)
2. **Colyseus Monitor** — tableau de bord serveur accessible depuis le navigateur
3. **Console du navigateur** — logs Colyseus, logs Phaser, erreurs réseau

---

## 1. DebugPanel client

### Activation

Pendant une session de jeu (`DungeonScene` active), appuyez sur la touche `` ` `` (backtick, en haut à gauche du clavier, à côté du `1`).

Un panneau semi-transparent apparaît en bas à gauche du canvas avec les informations suivantes :

| Champ | Description |
|-------|-------------|
| **FPS** | Images par seconde rendues par Phaser |
| **Ping** | Délai estimé depuis le dernier message Colyseus (approximatif) |
| **Session** | Identifiant de session Colyseus (`sessionId`) |
| **Rôle** | `GM 🎲` ou `Joueur ⚔️` |
| **Map** | Nom de la map active (`currentMap`) |
| **Tokens** | Nombre de tokens présents dans la room |

Appuyez à nouveau sur `` ` `` pour fermer le panneau.

> **Note** : Le DebugPanel n'envoie aucune donnée au serveur. Il est 100% lecture seule.

---

## 2. Colyseus Monitor

### Accès

Une fois le serveur démarré, ouvrez dans votre navigateur :

```
http://localhost:2567/colyseus
```

### Fonctionnalités

Le Monitor Colyseus affiche :

- **Rooms actives** : liste des rooms `dungeon` ouvertes, avec leur ID et nombre de joueurs
- **État en temps réel** : visualisation du `DungeonState` sérialisé (tokens, joueurs, fog, combat...)
- **Clients connectés** : `sessionId`, timestamp de connexion, options de join
- **Messages envoyés/reçus** : log des messages `MOVE_TOKEN`, `LOAD_MAP`, etc. en temps réel

### Inspecter l'état d'une room

1. Cliquer sur une room dans la liste
2. L'onglet **State** montre l'état complet (`players`, `tokens`, `currentMap`, `combatActive`...)
3. L'onglet **Messages** liste tous les messages échangés avec les horodatages

> **Astuce** : Ouvrir le Monitor sur un second écran pendant une session de jeu pour voir les deltas d'état en temps réel.

---

## 3. Console du navigateur

### Logs du client

Le client émet des messages `console.log` / `console.warn` / `console.error` préfixés :

| Préfixe | Source | Exemple |
|---------|--------|---------|
| `[MAP]` | `DungeonScene` | `[MAP] Changement de map → grande-salle` |
| `[MAP]` | `DungeonScene` | `[MAP] Image-map "ma-map" chargée (3 images, 80×60 cases)` |
| `[GMPanel]` | `GMPanel` | `[GMPanel] Lancement de MapEditorScene...` |
| `[NetworkManager]` | `ColyseusClient` | `[NetworkManager] Connecté à ws://localhost:2567 — sessionId: abc123` |

### Logs du serveur

Le serveur émet des messages dans le terminal (stdout) préfixés :

| Préfixe | Source | Exemple |
|---------|--------|---------|
| `[DungeonRoom]` | `DungeonRoom` | `[DungeonRoom] Salle créée — GM_PASSWORD=(défaut)` |
| `[DungeonRoom]` | `DungeonRoom` | `[DungeonRoom] Joueur connecté: abc123 (name="Alice")` |
| `[MAP]` | `DungeonRoom` | `[MAP] Chargement de la map "donjon" par le GM.` |

### Activer les logs Phaser

Pour afficher les logs internes de Phaser (utile pour déboguer le chargement d'assets) :

```typescript
// Dans main.ts, ajouter à la config :
const config: Phaser.Types.Core.GameConfig = {
  // ...
  banner: true,     // affiche la bannière Phaser au démarrage
  // Pour les logs verbeux des assets :
  loader: {
    // ...
  },
};
```

---

## 4. Tests automatisés (serveur)

Les tests Jest vérifient les règles métier de `DungeonRoom` sans démarrer le client Phaser.

### Exécuter les tests

```bash
cd server
npm test
```

### Résultat attendu

```
PASS src/rooms/DungeonRoom.test.ts
  DungeonRoom
    ✓ un joueur rejoint en tant que joueur normal par défaut
    ✓ un joueur avec le bon mot de passe devient GM
    ✓ MOVE_TOKEN : un joueur peut déplacer son propre token
    ✓ MOVE_TOKEN : le GM peut déplacer n'importe quel token
    ✓ MOVE_TOKEN : un joueur ne peut pas déplacer le token d'un autre joueur
    ✓ UPDATE_HP : le GM peut modifier les HP d'un token
    ✓ LOAD_MAP : le GM peut changer la map
    ✓ COMBAT_ACTION start : le GM peut démarrer le combat
    ... (21 tests)

Tests: 21 passed, 21 total
```

### Ajouter un test

```typescript
it("NOUVEAU_MESSAGE : description du comportement attendu", async () => {
  const room   = await colyseus.createRoom("dungeon", {});
  const client = await colyseus.connectTo(room, { name: "Alice" });

  await room.waitForNextPatch();

  client.send("NOUVEAU_MESSAGE", { /* données */ });
  await room.waitForNextPatch();

  expect(room.state.someField).toBe(expectedValue);
});
```

---

## 5. Variable d'environnement GM

Pour utiliser un mot de passe GM personnalisé (au lieu du défaut `"master1234"`) :

```bash
# Linux / Mac
GM_PASSWORD=monmotdepasse npm start

# Windows (PowerShell)
$env:GM_PASSWORD="monmotdepasse"; npm start

# Windows (cmd)
set GM_PASSWORD=monmotdepasse && npm start
```

Le même mot de passe doit être renseigné dans `client/public/player-config.GM.json` :

```json
{
  "name": "Game Master",
  "isGM": true,
  "gmPassword": "monmotdepasse"
}
```

---

## 6. Scénarios de test manuels

### Test basique (1 joueur + 1 GM)

1. Démarrer le serveur : `cd server && npm start`
2. Ouvrir `http://localhost:2567` dans **deux onglets**
3. Dans l'onglet 1 : renommer `player-config.example.json` → `player-config.json` (isGM: false)
4. Dans l'onglet 2 : utiliser `player-config.GM.json` → `player-config.json` (isGM: true)
5. Vérifier dans le Monitor : 2 clients connectés, 2 tokens dans la room
6. Cliquer sur la map dans l'onglet joueur → le token doit se déplacer dans les deux onglets

### Test sélecteur de map GM

1. Dans le panneau GM, sélectionner une map différente et cliquer **Charger cette map**
2. Vérifier que la nouvelle map s'affiche dans les deux onglets
3. Vérifier que les tokens sont repositionnés en case (20, 20)

### Test combat

1. Dans le panneau GM, cliquer **Démarrer** dans la section Combat
2. Vérifier dans le Monitor : `combatActive: true`, `currentTurn: 1`
3. Cliquer **→ Tour suivant** → `currentTurn` doit passer à 2
4. Cliquer **Fin** → `combatActive: false`, `currentTurn: 0`

### Test Fog of War

1. Dans le panneau GM, cocher **Fog global**
2. Vérifier dans le Monitor : `fogEnabled: true`
3. (Note : le rendu visuel du fog est prévu en Phase 4)
