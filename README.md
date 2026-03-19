# 🎲 TableTopeke

![Phase 0 - En cours](https://img.shields.io/badge/Phase%200-En%20cours-blue)
![Node.js](https://img.shields.io/badge/Node.js-LTS%2018%2F20-339933?logo=node.js)
![Colyseus](https://img.shields.io/badge/Colyseus-0.15-ff6b35)
![Phaser 3](https://img.shields.io/badge/Phaser%203-3.x-8a2be2)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)

> **VTT (Virtual TabletTop) multijoueur en ligne pour séances de jeu de rôle.**  
> Carte top-down synchronisée en temps réel, Fog of War avec ligne de vue, système de combat et gestion des rôles GM / Joueur.

---

## 🧩 Fonctionnalités prévues

- 🗺️ **Carte de donjon top-down** chargée depuis Tiled Map Editor (format JSON)
- 👥 **Multijoueur temps réel** — jusqu'à 5 joueurs simultanés via WebSocket
- 🔐 **Gestion des rôles** — Game Master (tous droits) vs Joueur (son token uniquement)
- 🌫️ **Fog of War double mode** — révélation globale par le GM + ligne de vue par joueur
- ⚔️ **Système de combat** — initiative, HP, tours, mesure de distances
- 📏 **Échelle configurable** — 1 case = X mètres, outil de mesure clic-glisser
- 🎨 **Personnalisation joueur** — nom, couleur, avatar, classe via `player-config.json`
- 📦 **Distribution simple** — lancement via `start.bat` / `start.sh` (Option A), packaging `.exe` prévu (Option B)

---

## 🛠️ Stack technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| **Serveur** | Node.js + Colyseus 0.15 | Autorité de l'état, WebSocket, rooms |
| **Client** | Phaser 3 + TypeScript | Rendu 2D, entrées souris/clavier, caméra |
| **Cartes** | Tiled Map Editor | Édition visuelle, export JSON |
| **Outils** | Vite, ts-node, pkg | Build, dev server, packaging |
| **Hébergement** | PC local (Option A) | `start.bat` / `start.sh` + URL locale |

---

## 🚀 Démarrage rapide

> ⚠️ **Phase 0 en cours** — Les instructions complètes seront disponibles dans [`docs/INSTALL.md`](docs/INSTALL.md) une fois le scaffold créé.

**Prérequis** : Node.js LTS 18 ou 20 installé sur le PC du GM.

```bash
# À venir — Phase 0
git clone https://github.com/zendidi/TableTopeke.git
cd TableTopeke
# npm install && npm start
```

Les **joueurs** n'ont rien à installer : ils ouvrent simplement l'URL fournie par le GM dans leur navigateur.

---

## 📚 Documentation

| Fichier | Description |
|---------|-------------|
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Suivi des phases du projet avec statuts |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Architecture technique détaillée |
| [`docs/INSTALL.md`](docs/INSTALL.md) | Guide d'installation complet |
| [`docs/GAMEPLAY.md`](docs/GAMEPLAY.md) | Mécaniques de jeu et rôles |
| [`CHANGELOG.md`](CHANGELOG.md) | Historique des versions |

---

## 🤝 Contribution / Avancement

Le projet suit une roadmap en phases successives. Consultez [`docs/ROADMAP.md`](docs/ROADMAP.md) pour l'état d'avancement détaillé de chaque fonctionnalité.

**Phase actuelle : Phase 0 — Setup & Scaffold** 🔄
