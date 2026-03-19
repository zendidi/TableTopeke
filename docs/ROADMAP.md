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
| **0** | Setup & Scaffold | 🔄 En cours |
| **1** | Serveur Colyseus — état & rôles | ⬜ À faire |
| **2** | Frontend Phaser 3 — carte & tokens | ⬜ À faire |
| **3** | Combat & Distances | ⬜ À faire |
| **4** | Fog of War (Ligne de vue réelle) | ⬜ À faire |
| **5** | Personnalisation joueurs | ⬜ À faire |
| **6** | Packaging & Distribution | ⬜ À faire |
| **7** | Création du Donjon | ⬜ À faire |

---

## Phase 0 — Setup & Scaffold 🔄 En cours

### Tâches

- [ ] Installer Node.js LTS (18 ou 20)
- [ ] Installer Colyseus CLI (`npm install -g create-colyseus-app`)
- [ ] Scaffold du projet (`npm create colyseus-app`)
- [ ] Configurer TypeScript (`tsconfig.json`)
- [ ] Configurer Vite pour le client
- [ ] Structure des dossiers `server/` et `client/`
- [ ] Hello World synchronisé : 2 onglets, un point qui bouge
- [ ] Télécharger le tileset LPC Dungeon (OpenGameArt)
- [ ] Commit initial du scaffold

### ✅ Critères de validation (Definition of Done)

- Le serveur Colyseus démarre sans erreur (`npm start`)
- Deux clients peuvent se connecter dans la même room
- Un message envoyé depuis un client est reçu par l'autre
- La structure de dossiers correspond à [`docs/ARCHITECTURE.md`](ARCHITECTURE.md)

---

## Phase 1 — Serveur Colyseus ⬜ À faire

### Schéma d'état

- [ ] `DungeonState` (état global de la room)
- [ ] `Token` (position, HP, owner, isVisible)
- [ ] `Player` (sessionId, name, color, isGM)

### Système de rôles

- [ ] Authentification GM par mot de passe (`onAuth`)
- [ ] Séparation des droits : GM (tous droits) vs Joueur (son token uniquement)
- [ ] Gestion de la déconnexion / reconnexion

### Messages

- [ ] `MOVE_TOKEN` — déplacer un token (joueur son token, GM tous)
- [ ] `UPDATE_HP` — modifier les HP d'un token (GM uniquement)
- [ ] `TOGGLE_FOG` — activer/désactiver le Fog of War (GM uniquement)
- [ ] `COMBAT_ACTION` — actions de combat (initiative, fin de tour)

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
