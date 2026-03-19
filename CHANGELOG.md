# Changelog — TableTopeke

Tous les changements notables de ce projet seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

---

## [Unreleased]

---

## [0.3.0] — Phase 1b : Sélecteur de map GM + LOAD_MAP + sync clients

### Ajouté
- Panel GM HTML overlay (`client/src/ui/GMPanel.ts`) — visible uniquement si `isGM: true`
  - Section "🗺️ Map active" : sélecteur de map depuis `maps/index.json`, bouton "Charger cette map"
  - Section "⚔️ Combat" : boutons Démarrer, Fin, Tour suivant
  - Section "👁️ Fog of War" : checkboxes Fog global et LOS
  - Section "📐 Échelle" : input numérique + bouton Appliquer
- Message Colyseus `LOAD_MAP { mapName: string }` — GM seulement (vérifié côté serveur)
- `DungeonState.currentMap: string` — nom de la map active synchronisé en temps réel sur tous les clients
- Méthode `network.loadMap(mapName)` dans `NetworkManager`
- Rechargement dynamique de carte dans `DungeonScene._loadMap()` sans rechargement de page
- Repositionnement automatique de tous les tokens à la case (20, 20) à chaque changement de map
- `tokenContainer` Phaser avec `setDepth(10)` — les tokens restent toujours au-dessus des layers carte
- Chargement de `maps/index.json` dans `BootScene.preload()` (clé `maps-index`)
- Pré-chargement dynamique de toutes les maps listées dans `index.json` dans `DungeonScene.preload()`

### Modifié
- `DungeonScene.ts` : refactorisation — `preload()` dynamique, `create()` avec `_loadMap()`, écoute `currentMap`
- `docs/ROADMAP.md` : Phase 1b ✅ Terminé
- `docs/ARCHITECTURE.md` : section LOAD_MAP mise à jour avec flux complet implémenté
- `docs/GAMEPLAY.md` : ajout section "Changer de map en session"

---

## [0.2.0] — Phase 1a : Tileset 0x72 + Rendu Tiled + Map de test

### Ajouté
- Intégration tileset 0x72 Dungeon (`client/public/tilesets/0x72_dungeon.png`) — placeholder transparent 16×16 fourni, remplacer par le vrai tileset
- Rendu carte Tiled dans `DungeonScene.ts` (remplacement de la grille placeholder)
  - `preload()` : chargement du tileset image + JSON Tiled
  - `create()` : `make.tilemap`, `addTilesetImage`, layers `sol` / `murs`, collisions
  - Zoom initial 2.5× pour tuiles 16px
  - Caméra bornée aux dimensions réelles de la map (`map.widthInPixels`)
- Map de test `client/public/maps/grande-salle.json` (40×40 cases, salle ouverte, 4 layers)
- Architecture `client/public/maps/` + index `maps/index.json`
- Guide créateur de maps `docs/TILED_GUIDE.md` (Tiled Map Editor, tileset 0x72, layers, export, distribution)
- Collisions activées sur le layer `murs` via `setCollisionByExclusion([-1])`

### Modifié
- `DungeonScene.ts` : `TILE_SIZE` 48 → 16 (taille réelle des tuiles du tileset)
- `docs/ROADMAP.md` : Phase 0 ✅ Terminé, Phase 1a ✅ Terminé, Phase 1b ⬜ À faire, ajout section "Décisions d'architecture — Maps"
- `docs/ARCHITECTURE.md` : mise à jour structure dossiers, ajout section "Gestion des maps"
- `README.md` : badge Phase 1a Terminé, fonctionnalités mises à jour, lien vers `TILED_GUIDE.md`

### Supprimé
- Méthode `_drawGrid()` dans `DungeonScene.ts` (remplacée par le rendu Tiled)
- Constantes `GRID_COLS` / `GRID_ROWS` (remplacées par `map.widthInPixels` / `map.heightInPixels`)

---

## [0.1.0] — Phase 0 : Setup & Documentation

### Ajouté
- `README.md` principal avec badges, fonctionnalités et liens vers la documentation
- `docs/ROADMAP.md` : suivi détaillé des 8 phases du projet avec statuts et critères de validation
- `docs/ARCHITECTURE.md` : schéma ASCII, structure des dossiers, flux de données, correspondance Unity/C# → Stack Web
- `docs/INSTALL.md` : guide d'installation complet (GM et joueurs), référence `player-config.json`, FAQ
- `docs/GAMEPLAY.md` : documentation des mécaniques de jeu (rôles, combat, FoW, distances)
- `CHANGELOG.md` : ce fichier

---

<!-- Modèle pour les futures entrées :

## [X.Y.Z] — YYYY-MM-DD

### Ajouté
- Nouvelles fonctionnalités

### Modifié
- Changements dans les fonctionnalités existantes

### Corrigé
- Corrections de bugs

### Supprimé
- Fonctionnalités supprimées

-->
