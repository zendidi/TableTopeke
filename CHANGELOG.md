# Changelog — TableTopeke

Tous les changements notables de ce projet seront documentés dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Versionnage Sémantique](https://semver.org/lang/fr/).

---

## [Unreleased]

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
