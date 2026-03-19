# 🎮 Mécaniques de jeu — TableTopeke

## Les rôles

### 🎭 Game Master (GM)

Le Game Master est le maître du jeu. Il héberge le serveur et dispose de tous les droits.

**Il peut :**
- 🔀 Déplacer tous les tokens (les siens et ceux des joueurs)
- ❤️ Modifier les HP de n'importe quel token
- 🌫️ Activer / désactiver le Fog of War (deux modes indépendants)
- 🗺️ Révéler ou cacher des zones de la carte
- ⚔️ Gérer l'initiative et l'ordre des tours
- 👁️ Voir l'intégralité de la carte à tout moment

**Comment devenir GM :**
Dans `player-config.json` : `"isGM": true` + `"gmPassword": "votre_mot_de_passe"`

---

### 🧙 Game Player (Joueur)

Le joueur contrôle son propre personnage.

**Il peut :**
- 🚶 Déplacer son propre token
- 👁️ Voir la carte dans le rayon de vision de son personnage (si Fog of War activé)
- 📏 Utiliser l'outil de mesure de distance

**Il ne peut PAS :**
- Déplacer le token d'un autre joueur
- Modifier des HP
- Contrôler le Fog of War
- Voir les zones non révélées ou hors de sa ligne de vue

---

## Déplacement des tokens

### Règles de déplacement

| Qui | Peut déplacer |
|-----|--------------|
| Joueur | Son propre token uniquement |
| GM | Tous les tokens |

### Comment déplacer un token

1. **Cliquez** sur votre token pour le sélectionner (bordure lumineuse)
2. **Cliquez** sur la case de destination
3. Le déplacement est envoyé au serveur et visible par tous en temps réel

### Navigation sur la carte

| Action | Contrôle |
|--------|---------|
| Scroll / déplacement caméra | Clic droit + glisser |
| Zoom avant | Molette vers le haut |
| Zoom arrière | Molette vers le bas |

---

## Système de combat

### Initiative

L'initiative détermine l'ordre de passage des combattants.

1. **Le GM lance l'initiative** depuis le panneau GM
2. Chaque combattant entre son score d'initiative
3. L'**Initiative Tracker** affiche la liste ordonnée
4. Le combattant actif est mis en évidence sur la carte ET dans le tracker

### Déroulement d'un round

```
Round 1
├─ Combattant 1 (initiative 20) → Actif → Fin de tour →
├─ Combattant 2 (initiative 15) → Actif → Fin de tour →
├─ Combattant 3 (initiative 12) → Actif → Fin de tour →
└─ Retour au Combattant 1 → Round 2
```

### Points de vie (HP)

- Une **barre de HP** est visible au-dessus de chaque token
- Seul le **GM** peut modifier les HP
- Les HP sont synchronisés en temps réel pour tous les joueurs
- Quand les HP atteignent 0, le token est marqué comme "hors combat"

---

## Mesure des distances

### Échelle de la carte

La carte est divisée en **cases** (grille). L'échelle est configurable par le GM :
- Exemple : 1 case = 1,5 mètre (standard D&D/Pathfinder)
- Exemple : 1 case = 5 pieds

### Outil de mesure

1. **Activez l'outil** de mesure dans l'interface
2. **Cliquez et glissez** entre deux points de la carte
3. La distance s'affiche en **cases** ET en **mètres** en temps réel

### Portée des actions

- Sélectionnez un token pour afficher son **cercle de portée**
- La portée est définie par la classe / les capacités du personnage
- Les cases dans le cercle sont mises en évidence

### Tableau de référence

| Distance | Cases (1 case = 1,5m) |
|----------|----------------------|
| 1,5 m | 1 case |
| 3 m | 2 cases |
| 6 m | 4 cases |
| 9 m | 6 cases |
| 18 m | 12 cases |

---

## Fog of War — Les deux modes

Le GM peut activer deux modes de Fog of War **indépendamment** via son panneau de contrôle.

### 🌫️ Mode 1 — Révélation globale

**Principe :** Le GM révèle et cache des zones pour TOUS les joueurs simultanément.

**Utilisation typique :** Dévoiler une nouvelle salle quand les joueurs l'explorent.

**Comportement :**
- Les zones **non révélées** : noires pour les joueurs (mais visibles pour le GM)
- Les zones **révélées** : visibles par tous les joueurs
- Le GM peut **re-cacher** une zone si nécessaire

**Activation :** Switch "Révélation Globale" dans le panneau GM

---

### 👁️ Mode 2 — Ligne de vue par joueur (LOS)

**Principe :** Chaque joueur ne voit que ce que son personnage verrait réellement (raycasting).

**Utilisation typique :** Immersion maximale — le couloir derrière le mur est invisible.

**Comportement :**
- Chaque joueur a un **rayon de vision** (configurable par classe)
- Les **murs** bloquent la ligne de vue
- Les zones **hors du rayon** ou **derrière des obstacles** sont dans le brouillard
- Le GM voit **toujours tout**, même avec ce mode actif

**Activation :** Switch "Vision LOS" dans le panneau GM

---

### Combinaison des deux modes

| Révélation Globale | LOS | Résultat pour les joueurs |
|-------------------|-----|--------------------------|
| ❌ Off | ❌ Off | Toute la carte est visible |
| ✅ On | ❌ Off | Seulement les zones révélées par le GM |
| ❌ Off | ✅ On | Seulement ce que le personnage voit (rayon) |
| ✅ On | ✅ On | Zones révélées ET dans la ligne de vue |

---

## Personnalisation du joueur

Chaque joueur configure son expérience via `player-config.json`.

| Paramètre | Effet en jeu |
|-----------|-------------|
| `name` | Affiché au-dessus du token et dans l'interface |
| `color` | Couleur du token et de la mise en évidence |
| `avatarUrl` | Photo/image visible dans le panneau joueur |
| `class` | Affiché dans l'interface, peut influencer la portée |
| `hp` / `hpMax` | HP initiaux — modifiés par le GM en cours de jeu |

### Configuration de la portée par classe

> ⚠️ **À définir en Phase 3** — Les portées par défaut seront configurables dans un fichier dédié.

---

## Interface de jeu

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────┐
│  [Barre d'outils]  Déplacement | Mesure | Portée        │
├────────────────────────────────────┬────────────────────┤
│                                    │  Initiative Tracker │
│                                    │  ─────────────────  │
│                                    │  1. Thorin (20)  ◄  │
│         CARTE DE JEU               │  2. Elara  (15)     │
│       (Phaser 3 - Tiled)           │  3. Goblin (12)     │
│                                    │  ─────────────────  │
│  [Token Thorin]  [Token Elara]     │  Round : 1          │
│       HP ████░░░░                  │  ─────────────────  │
│                                    │  [Panneau GM]       │
│                                    │  (visible GM seul)  │
└────────────────────────────────────┴────────────────────┘
```

### Panneau GM (visible uniquement par le GM)

- Liste de tous les joueurs connectés avec leurs HP
- Switches Fog of War (Révélation / LOS)
- Boutons de gestion de l'initiative
- Actions rapides : reveal zone, reset HP, ...

---

## Changer de map en session

### Rôle requis : 🎭 Game Master uniquement

Le GM peut changer la carte affichée pour tous les joueurs en cours de session, sans rechargement de page.

### Procédure

1. **Ouvrir le Panneau GM** (visible uniquement dans l'onglet GM)
2. **Localiser la section "🗺️ Map active"**
3. **Sélectionner** la nouvelle map dans la liste déroulante
   - Les maps disponibles proviennent de `client/public/maps/index.json`
4. **Cliquer sur "Charger cette map"**

### Ce qui se passe après

- La nouvelle carte apparaît immédiatement pour **tous les clients connectés** (GM + joueurs)
- Tous les tokens sont **repositionnés automatiquement** à la case (20, 20)
- La caméra s'adapte aux dimensions de la nouvelle carte
- Le changement est synchronisé en temps réel via Colyseus (`LOAD_MAP`)

### Ajouter une nouvelle map

1. Créer la map dans **Tiled Map Editor** (voir `docs/TILED_GUIDE.md`)
2. Exporter en JSON dans `client/public/maps/`
3. Ajouter une entrée dans `client/public/maps/index.json` :
   ```json
   { "id": "nom-de-la-map", "label": "Nom Affiché", "description": "..." }
   ```
4. La map apparaît automatiquement dans le sélecteur du panel GM

### Indicateurs visuels

| Indicateur | Signification |
|------------|--------------|
| Bordure brillante sur token | Token sélectionné |
| Pulsation dorée | Combattant actif (son tour) |
| Barre verte | HP > 50% |
| Barre orange | HP entre 25% et 50% |
| Barre rouge | HP < 25% |
| Token grisé | Hors combat (HP = 0) |
