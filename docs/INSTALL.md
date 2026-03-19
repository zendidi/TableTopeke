# 📦 Guide d'installation — TableTopeke

## Prérequis

### Node.js LTS (GM uniquement)

Seul le **Game Master** (la personne qui héberge le serveur) a besoin d'installer Node.js.  
Les joueurs n'ont **rien à installer** — ils ouvrent juste un navigateur.

| Version | Lien de téléchargement |
|---------|----------------------|
| Node.js 18 LTS ✅ | https://nodejs.org/en/download (choisir "18.x LTS") |
| Node.js 20 LTS ✅ | https://nodejs.org/en/download (choisir "20.x LTS") |

> ⚠️ Choisissez une version **LTS** (Long Term Support). Évitez les versions "Current".

**Vérification de l'installation :**
```bash
node --version   # Doit afficher v18.x.x ou v20.x.x
npm --version    # Doit afficher 9.x.x ou 10.x.x
```

---

## Instructions pour le Game Master

### Étape 1 — Cloner le dépôt

```bash
git clone https://github.com/zendidi/TableTopeke.git
cd TableTopeke
```

Ou téléchargez le ZIP depuis GitHub et décompressez-le.

### Étape 2 — Installer les dépendances

```bash
# Depuis le dossier racine du projet
npm install
```

> ⚠️ **Phase 0 en cours** — Cette commande sera disponible une fois le scaffold créé.

### Étape 3 — Configurer votre profil GM

Éditez le fichier `player-config.json` à la racine du projet :

```json
{
  "name": "Dungeon Master",
  "color": "#FF4444",
  "avatarUrl": "",
  "class": "GM",
  "hp": 0,
  "hpMax": 0,
  "isGM": true,
  "gmPassword": "votre_mot_de_passe_secret"
}
```

> 🔐 **Gardez `gmPassword` secret !** Ne partagez pas ce fichier avec vos joueurs.

### Étape 4 — Lancer le serveur

**Windows :**
```
Double-clic sur start.bat
```

**Mac / Linux :**
```bash
chmod +x start.sh  # Une seule fois
./start.sh
```

Le terminal affiche :
```
🎲 TableTopeke Server démarré
🌐 Accès local  : http://localhost:2567
📡 Accès réseau : http://192.168.1.XX:2567
```

### Étape 5 — Trouver votre IP locale et la partager

#### Windows
```
Touche Windows + R → tapez "cmd" → Entrée
ipconfig
```
Cherchez **"Adresse IPv4"** dans la section de votre connexion active (WiFi ou Ethernet).  
Exemple : `192.168.1.42`

#### Mac
```bash
ifconfig en0 | grep inet
# ou
ipconfig getifaddr en0
```

#### Linux
```bash
ip addr show | grep "inet "
# ou
hostname -I
```

Partagez l'URL avec vos joueurs : `http://192.168.1.42:2567`

---

## Instructions pour les Joueurs

> ✅ **Vous n'avez rien à installer.** Ouvrez simplement votre navigateur.

### Étape 1 — Configurer votre profil joueur

Créez un fichier `player-config.json` dans le dossier du jeu fourni par le GM :

```json
{
  "name": "Thorin",
  "color": "#FFD700",
  "avatarUrl": "https://example.com/mon-avatar.png",
  "class": "Guerrier",
  "hp": 40,
  "hpMax": 40,
  "isGM": false,
  "gmPassword": ""
}
```

### Étape 2 — Rejoindre la partie

1. Ouvrez votre navigateur (Chrome, Firefox, Edge — tous compatibles)
2. Entrez l'URL fournie par le GM : `http://192.168.X.X:2567`
3. Votre token apparaît sur la carte !

---

## Configuration `player-config.json` — Référence complète

| Champ | Type | Obligatoire | Description |
|-------|------|-------------|-------------|
| `name` | string | ✅ | Nom affiché sur votre token |
| `color` | string | ✅ | Couleur hex du token (`#RRGGBB`) |
| `avatarUrl` | string | ❌ | URL d'une image pour votre avatar (peut être vide `""`) |
| `class` | string | ❌ | Classe du personnage (affiché dans l'UI) |
| `hp` | number | ✅ | Points de vie actuels |
| `hpMax` | number | ✅ | Points de vie maximum |
| `isGM` | boolean | ✅ | `true` pour le Game Master, `false` pour les joueurs |
| `gmPassword` | string | GM only | Mot de passe GM (laisser `""` pour les joueurs) |

### Exemples de couleurs

| Couleur | Code |
|---------|------|
| 🔴 Rouge | `#FF4444` |
| 🔵 Bleu | `#4444FF` |
| 🟢 Vert | `#44FF44` |
| 🟡 Or | `#FFD700` |
| 🟣 Violet | `#AA44FF` |
| ⚪ Blanc | `#FFFFFF` |

---

## FAQ

### ❓ Les joueurs ne peuvent pas se connecter

**Vérifications à faire :**

1. **Le serveur est-il lancé ?** Le terminal du GM doit afficher "Server démarré"
2. **Même réseau WiFi ?** Tous les joueurs doivent être sur le même réseau que le GM (ou internet si déployé en cloud)
3. **Pare-feu Windows ?** Autorisez Node.js dans le pare-feu Windows :
   - Panneau de configuration → Pare-feu Windows Defender
   - Autoriser une application → Cochez `node.exe`
4. **Port 2567 bloqué ?** Testez avec : `http://[IP_GM]:2567` — si ça ne répond pas, le port est peut-être bloqué

### ❓ Le port 2567 est déjà utilisé

Changez le port dans `server/src/index.ts` :
```typescript
gameServer.listen(2568); // ou tout autre port disponible
```
Et relancez le serveur.

### ❓ Un joueur s'est déconnecté en pleine partie

Pas de panique ! La reconnexion est automatique. Le joueur rouvre simplement l'URL dans son navigateur. Son token reste sur la carte en attendant.

### ❓ Le GM veut changer son mot de passe

Éditez `gmPassword` dans `player-config.json` et relancez le serveur.

### ❓ L'avatar URL ne s'affiche pas

Vérifiez que :
- L'URL est accessible depuis votre réseau
- L'image est au format PNG, JPG ou GIF
- L'URL ne contient pas d'espaces

### ❓ Comment accéder depuis internet (pas seulement en local) ?

**Option rapide (Cloudflare Tunnel) :**
```bash
# Installer cloudflared
# puis :
cloudflared tunnel --url http://localhost:2567
```
Cloudflare génère une URL publique temporaire gratuite.

**Option permanente :** Déployez sur Render.com ou Railway.app (voir `docs/ROADMAP.md` Phase 6 Option C).
