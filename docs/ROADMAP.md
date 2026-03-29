# 🗺️ Roadmap — TableTopeke

## Légende des statuts

| Symbole | Signification |
|---------|--------------|
| ⬜ | À faire |
| 🔄 | En cours |
| 🔶 | Avancé (fonctionnel mais non finalisé) |
| ✅ | Terminé |

---

## 📊 Vue d'ensemble

| Phase | Description | Statut |
|-------|-------------|--------|
| **0** | Setup & Scaffold | ✅ Terminé |
| **1a** | Tileset 0x72 + rendu carte Tiled + map de test | ✅ Terminé |
| **1b** | Sélecteur de map GM + sync Colyseus `LOAD_MAP` | ✅ Terminé |
| **1c** | Éditeur de map par images drag & drop (GM only) | ✅ Terminé |
| **2** | Serveur Colyseus — état & rôles avancés | ✅ Terminé |
| **3** | Combat & Distances | ⬜ À faire |
| **4** | Fog of War (Ligne de vue réelle) | ⬜ À faire |
| **5** | Personnalisation joueurs | ⬜ À faire |
| **6** | Packaging & Distribution | ⬜ À faire |
| **7** | Création du Donjon | ⬜ À faire |

---

## Phase 0 — Setup & Scaffold ✅ Terminé

### Tâches

- [x] Installer Node.js LTS (18 ou 20)
- [x] Installer Colyseus CLI (`npm install -g create-colyseus-app`)
- [x] Scaffold du projet (`npm create colyseus-app`)
- [x] Configurer TypeScript (`tsconfig.json`)
- [x] Configurer Vite pour le client
- [x] Structure des dossiers `server/` et `client/`
- [x] Hello World synchronisé : 2 onglets, un point qui bouge
- [x] Commit initial du scaffold

### ✅ Critères de validation (Definition of Done)

- Le serveur Colyseus démarre sans erreur (`npm start`)
- Deux clients peuvent se connecter dans la même room
- Un message envoyé depuis un client est reçu par l'autre
- La structure de dossiers correspond à [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)

---

## Phase 1a — Tileset 0x72 + Rendu Tiled + Map de test ✅ Terminé

### Tâches

- [x] Intégration tileset 0x72 Dungeon (`client/public/tilesets/0x72_dungeon.png`)
- [x] Refactorisation de `DungeonScene.ts` — remplacement grille placeholder par carte Tiled
- [x] Chargement Tiled JSON : `preload()` + `create()` avec layers `sol` / `murs` / `tokens`
- [x] Collisions sur le layer `murs` (`setCollisionByExclusion`)
- [x] Caméra bornée aux dimensions réelles de la map
- [x] Zoom initial 2.5× pour tuiles 16px
- [x] Map de test `client/public/maps/grande-salle.json` (40×40 cases, salle ouverte)
- [x] Architecture `client/public/maps/` + index des maps `maps/index.json`
- [x] Guide créateur de maps `docs/TILED_GUIDE.md`

### Architecture maps retenue

- Maps créées en amont dans **Tiled Map Editor** (outil externe, gratuit)
- Format : **JSON export Tiled**, placé dans `client/public/maps/`
- Distribution : `git push` ou envoi direct du `.json` aux joueurs
- Index : `maps/index.json` liste les maps disponibles (id, label, description)
- Chargement en session : message `LOAD_MAP` GM → sync temps réel (Phase 1b)

### ✅ Critères de validation (Definition of Done)

- `npm start` dans `server/` démarre sans erreur TypeScript
- `npm run dev` dans `client/` démarre Vite sans erreur
- La map `grande-salle.json` est un JSON Tiled valide (structure `layers`, `tilesets`, `width`, `height`)
- La carte s'affiche (ou le placeholder) sans erreur console
- Les tokens apparaissent et se déplacent (synchronisation Colyseus intacte)
- La caméra est bornée aux dimensions réelles de la map
- `maps/index.json` contient `grande-salle` correctement formaté
- `docs/TILED_GUIDE.md` existe et est complet

---

## Phase 1b — Sélecteur de map GM ✅ Terminé

### Tâches

- [x] Sélecteur de map GM (liste depuis `maps/index.json`)
- [x] Message Colyseus `LOAD_MAP { mapName: string }` — GM uniquement
- [x] `DungeonState.currentMap` synchronisé en temps réel sur tous les clients
- [x] Rechargement dynamique du JSON Tiled côté Phaser (sans rechargement de page)
- [x] Repositionnement de tous les tokens au centre (case 20,20) à chaque changement de map
- [x] Panel GM HTML overlay : sections Map, Combat, Fog of War, Échelle

### ✅ Critères de validation

- Le GM peut changer de map en cours de session
- Tous les clients voient la nouvelle map en < 500ms
- Les tokens sont repositionnés sur la nouvelle map (case 20,20)
- Un joueur non-GM ne peut pas déclencher `LOAD_MAP` (vérifié côté serveur)

---

## Phase 1c — Éditeur de map par images ✅ Terminé

### Tâches

- [x] `client/public/images/` avec 3 placeholders PNG (320×240) + `index.json`
- [x] Types partagés `client/src/types/MapTypes.ts` (`PlacedImage`, `ImageMapData`, `MapIndex`)
- [x] Composant `ImagePalette` (HTML overlay fixe gauche) — liste images depuis `images/index.json`
- [x] Scène `MapEditorScene` (Phaser) :
  - [x] Accès GM uniquement (redirect vers DungeonScene sinon)
  - [x] Grille 80×60 cases × 64 px, fond noir
  - [x] Caméra bornée, zoom 0.5× initial (molette 0.2–2.0)
  - [x] Palette d'images + mode placement (snap à la grille)
  - [x] Drag pour déplacer une image placée
  - [x] Clic droit pour supprimer une image placée
  - [x] Barre d'outils HTML : nom map, 💾 Sauvegarder, 📂 Charger, 🗑️ Effacer, 🎮 Retour
  - [x] `saveMap()` → téléchargement JSON navigateur
  - [x] `loadMapFromFile()` → FileReader, validation `type === "image-map"`
  - [x] Nettoyage palette + toolbar au `shutdown()`
- [x] `DungeonScene` : support format `image-map` via `fetch` + chargement dynamique des images
- [x] `MapEditorScene` enregistrée dans `main.ts`
- [x] `window.__phaserGame` exposé dans `main.ts`
- [x] Bouton "🗺️ Éditeur de map" dans `GMPanel`
- [x] `BootScene` charge `images/index.json`
- [x] Guide `docs/MAP_EDITOR_GUIDE.md`

### ✅ Critères de validation

- Le bouton "🗺️ Éditeur de map" est visible dans le panel GM uniquement
- Cliquer le bouton lance `MapEditorScene` (grille + palette visibles)
- Cliquer "Placer" puis la grille place l'image snappée à la case
- Clic droit sur une image placée → suppression
- Bouton "Sauvegarder" → télécharge `nom-map.json` avec `"type": "image-map"`
- Bouton "Retour au donjon" → retour propre à `DungeonScene` (palette détruite)
- Joueur non-GM redirigé vers `DungeonScene` s'il tente d'accéder à `MapEditorScene`
- `docs/MAP_EDITOR_GUIDE.md` existe et est complet

---

## Phase 2 — Serveur Colyseus ✅ Terminé

### Schéma d'état

- [x] `DungeonState` (état global de la room)
- [x] `Token` (position, HP, owner, isVisible)
- [x] `Player` (sessionId, name, color, isGM)

### Système de rôles

- [x] Authentification GM par mot de passe (`onAuth`)
- [x] Séparation des droits : GM (tous droits) vs Joueur (son token uniquement)
- [x] Gestion de la déconnexion / reconnexion

### Messages

- [x] `MOVE_TOKEN` — déplacer un token (joueur son token, GM tous)
- [x] `UPDATE_HP` — modifier les HP d'un token (GM uniquement)
- [x] `TOGGLE_FOG` — activer/désactiver le Fog of War (GM uniquement)
- [x] `COMBAT_ACTION` — actions de combat (start, end, next)

### ✅ Critères de validation

- 5 clients peuvent se connecter simultanément
- Le GM peut déplacer tous les tokens
- Un joueur ne peut déplacer que son propre token
- Les changements d'état sont propagés à tous les clients en < 200ms

---

## Phase 2 — Frontend Phaser 3 ⬜ À faire

### Chargement de la carte

- [ ] Import du tileset LPC Dungeon
- [ ] Chargement de la carte Tiled JSON (`this.make.tilemap`)
- [ ] Rendu des layers : fond, murs, décoration, collisions

### Tokens

- [ ] Affichage des tokens joueurs (sprite + nom)
- [ ] Synchronisation des positions (interpolation douce entre les ticks)
- [ ] Sélection et déplacement par clic (selon les droits du rôle)

### Caméra & Interface

- [ ] Scroll de caméra (clic droit + glisser)
- [ ] Zoom (molette souris)
- [ ] Interface GM : panneau latéral (liste joueurs, HP, actions)
- [ ] Indicateur de tour actif / combattant courant

### ✅ Critères de validation

- La carte s'affiche correctement dans le navigateur
- Les tokens des joueurs sont visibles et synchronisés
- Le déplacement d'un token est visible par tous les clients < 200ms
- La caméra permet de naviguer sur toute la carte

---

## Phase 3 — Combat & Distances ⬜ À faire

### Grille & Échelle

- [ ] Affichage de la grille de cases sur la carte
- [ ] Paramètre configurable : 1 case = X mètres (ex: 1.5m)

### Outil de mesure

- [ ] Clic-glisser pour mesurer une distance
- [ ] Affichage de la distance en cases ET en mètres

### Portée

- [ ] Cercle de portée autour du token sélectionné
- [ ] Paramètre de portée par token/classe

### Initiative & Combat

- [ ] Initiative tracker : liste ordonnée des combattants
- [ ] Round counter
- [ ] Barre de HP visuelle au-dessus de chaque token
- [ ] Fin de tour (passage au combattant suivant)

### ✅ Critères de validation

- La grille est visible et s'aligne avec la carte
- La mesure clic-glisser affiche la bonne distance en mètres
- L'initiative tracker est synchronisé entre tous les clients
- Les HP sont mis à jour en temps réel sur les tokens

---

## Phase 4 — Fog of War (Ligne de vue réelle) ⬜ À faire

### Mode "Révélation globale"

- [ ] Le GM peut révéler / cacher des zones entières (salles)
- [ ] Masque visuel pour les zones non révélées
- [ ] Switch GM on/off pour ce mode

### Mode "Vision par joueur" (raycasting LOS)

- [ ] Chaque joueur a un rayon de vision configurable
- [ ] Algorithme de raycasting sur la grille Tiled
- [ ] Les murs bloquent la ligne de vue
- [ ] Switch GM on/off pour ce mode

### ✅ Critères de validation

- En mode révélation globale, les zones cachées sont noires pour les joueurs
- En mode LOS, chaque joueur ne voit que ce que son token verrait
- Le GM voit toujours tout, indépendamment des modes actifs
- Les deux modes peuvent être actifs simultanément

---

## Phase 5 — Personnalisation joueurs ⬜ À faire

### Fichier de configuration

- [ ] Structure `player-config.json` documentée
- [ ] Champs : `name`, `color`, `avatarUrl`, `class`, `hp`, `hpMax`, `isGM`, `gmPassword`
- [ ] Chargement au démarrage du client
- [ ] Transmission au serveur à la connexion
- [ ] Validation des champs côté serveur

### ✅ Critères de validation

- Le nom et la couleur du joueur s'affichent sur son token
- L'avatar est visible dans l'interface
- Un mauvais mot de passe GM est rejeté par le serveur

---

## Phase 6 — Packaging & Distribution ⬜ À faire

### Option A — Lancement local (prioritaire)

- [ ] Script `start.bat` (Windows)
- [ ] Script `start.sh` (Mac/Linux)
- [ ] Build frontend statique avec Vite
- [ ] README d'installation simplifié
- [ ] Test 5 connexions simultanées

### Option B — Exécutable standalone (prévu)

- [ ] Packaging avec `pkg` (Vercel) → `server.exe`
- [ ] Test de l'exécutable sur machine sans Node.js

### Option C — Déploiement cloud (optionnel)

- [ ] Déploiement sur Render.com ou Railway.app
- [ ] Documentation de la procédure de déploiement

### ✅ Critères de validation

- `start.bat` / `start.sh` lance le serveur en un double-clic
- 5 joueurs peuvent se connecter simultanément sans erreur
- Le build Vite produit un frontend statique fonctionnel

---

## Phase 7 — Création du Donjon ⬜ À faire

### Carte dans Tiled Map Editor

- [ ] Téléchargement et installation de Tiled
- [ ] Import du tileset LPC Dungeon
- [ ] Création des layers : fond, murs, décoration, collisions, triggers
- [ ] Design du donjon (salles, couloirs, portes)
- [ ] Export JSON → dossier `client/assets/maps/`

### ✅ Critères de validation

- La carte s'affiche correctement dans Phaser 3
- Les collisions sont fonctionnelles (les tokens ne traversent pas les murs)
- Les layers sont correctement nommés et référencés dans le code

---

## 🏛️ Décisions techniques

| Décision | Choix retenu | Raison |
|----------|--------------|--------|
| **Sync réseau** | Colyseus | Delta binaire automatique (-90% bande passante vs Socket.io), rooms intégrées, autorité serveur native |
| **Rendu 2D** | Phaser 3 | Tilemaps Tiled nativement supportés, caméra/zoom intégrés, input souris/clavier, Fog of War via plugins |
| **Format cartes** | Tiled Map Editor (JSON) | Standard industrie indie, export natif Phaser, édition visuelle en couches |
| **Hébergement** | Local Option A | PC du GM, zéro frais, zéro latence, `start.bat` double-clic. Extensible vers B (exe) ou C (cloud) |
| **Fog of War** | Raycasting LOS | Demandé explicitement, plus immersif, compatible grille Tiled |
| **Language** | TypeScript | Typage fort (proche C#), meilleure DX, compatible Colyseus & Phaser |

---

## 🗺️ Décisions d'architecture — Maps

| Aspect | Choix retenu |
|--------|-------------|
| **Création** | Maps créées en amont dans **Tiled Map Editor** (outil externe, gratuit) |
| **Format** | JSON export Tiled, placé dans `client/public/maps/` |
| **Distribution** | `git push` ou envoi direct du `.json` aux joueurs |
| **Index** | `maps/index.json` liste les maps disponibles (id, label, description) |
| **Layers obligatoires** | `sol` (fond), `murs` (collisions), `tokens` (réservé Phaser) |
| **Tileset** | 0x72 Dungeon Tileset II — tuiles 16×16 px |
| **Chargement en session** | Message `LOAD_MAP { mapName }` GM → sync Colyseus temps réel (Phase 1b) |
