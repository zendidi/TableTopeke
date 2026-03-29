# 🗺️ Guide de l'éditeur de map par images — TableTopeke

## Introduction

L'éditeur de map par images est un outil intégré à TableTopeke, accessible uniquement au Game Master (GM).
Il permet de composer une grande map de jeu en plaçant des images PNG sur une grille, de sauvegarder la composition en JSON, puis de la charger en session via le sélecteur de map.

---

## Accéder à l'éditeur

1. Lancez le serveur et le client normalement (`start.bat` ou `npm start`)
2. Connectez-vous avec un `player-config.json` avec `"isGM": true`
3. Dans la scène de jeu, ouvrez le **Panneau Game Master** (overlay en haut à droite)
4. Cliquez sur le bouton **🗺️ Éditeur de map**

L'éditeur s'ouvre dans la même fenêtre. La scène de jeu est remplacée par la grille de l'éditeur.

> **Note :** Si vous n'êtes pas GM, le bouton n'est pas visible et la scène `MapEditorScene` redirige automatiquement vers `DungeonScene`.

---

## Préparer ses images

### Format recommandé

- **Format :** PNG (ou JPG)
- **Dimensions conseillées :** n'importe quelle résolution PNG convient — l'image sera redimensionnée en fonction de `defaultWidthInTiles` × `defaultHeightInTiles`
  - `defaultWidthInTiles: 20` à 64 px/case → l'image sera affichée sur 1280 px de large
  - `defaultWidthInTiles: 10` à 64 px/case → 640 px de large
  - Pour un rendu net, utilisez un PNG dont la résolution est un multiple de la taille cible (ex. 1280×960 pour 20×15 cases)

### Où placer les images

Copiez vos fichiers PNG dans :

```
client/public/images/
├── index.json              ← registre des images disponibles
├── salle-principale.png    ← vos images ici
├── couloir-horizontal.png
└── salle-secondaire.png
```

> Les images dans ce dossier sont servies statiquement et accessibles dans le navigateur.

---

## Ajouter une image à la palette

Ouvrez `client/public/images/index.json` et ajoutez une entrée dans le tableau `images` :

```json
{
  "images": [
    {
      "id": "ma-salle",
      "label": "Ma Salle",
      "file": "ma-salle.png",
      "defaultWidthInTiles": 20,
      "defaultHeightInTiles": 15
    }
  ]
}
```

| Champ                  | Description |
|------------------------|-------------|
| `id`                   | Identifiant unique (sans espaces ni accents) |
| `label`                | Nom affiché dans la palette |
| `file`                 | Nom du fichier PNG dans `client/public/images/` |
| `defaultWidthInTiles`  | Largeur par défaut en cases lors du placement |
| `defaultHeightInTiles` | Hauteur par défaut en cases lors du placement |

Relancez le serveur pour que les nouvelles images apparaissent dans la palette.

---

## Utiliser l'éditeur

### Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  Barre d'outils (haut) : Nom | 💾 Sauvegarder | 📂 Charger      │
│                               🗑️ Effacer | 🎮 Retour | État      │
├──────────┬──────────────────────────────────────────────────────┤
│ Palette  │                                                       │
│ 🖼️ Images │              Grille de l'éditeur                     │
│          │           (80×60 cases, zoom 0.5×)                   │
│ [Image1] │                                                       │
│ [Placer] │                                                       │
│          │                                                       │
│ [Image2] │                                                       │
│ [Placer] │                                                       │
└──────────┴──────────────────────────────────────────────────────┘
```

### Placer une image

1. Dans la **palette à gauche**, cliquez sur le bouton **Placer** sous l'image souhaitée
2. Le curseur passe en mode placement (message "🖱️ Cliquez sur la grille pour placer")
3. **Cliquez** sur la case de destination dans la grille
4. L'image s'affiche snappée à la case la plus proche

### Déplacer une image placée

1. **Clic gauche** sur l'image placée → elle se sélectionne (contour violet)
2. **Maintenir le clic gauche + glisser** vers la nouvelle position
3. L'image se repositionne à la case la plus proche au relâchement

### Supprimer une image placée

- **Clic droit** sur l'image placée → elle est supprimée immédiatement

### Naviguer dans la grille

- **Clic droit + glisser** (sur une zone vide) → déplace la caméra
- **Molette souris** → zoom (de 0.2× à 2.0×)

---

## Sauvegarder une map

1. Entrez le **nom de la map** dans le champ en haut à gauche de la barre d'outils
2. Cliquez sur **💾 Sauvegarder**
3. Un fichier `nom-de-la-map.json` est téléchargé dans votre dossier de téléchargements

Le JSON généré a le format suivant :

```json
{
  "id": "ma-map",
  "label": "ma-map",
  "type": "image-map",
  "widthInTiles": 80,
  "heightInTiles": 60,
  "tileSize": 64,
  "images": [
    {
      "id": "img_1234567890",
      "src": "images/salle-principale.png",
      "x": 5,
      "y": 3,
      "widthInTiles": 20,
      "heightInTiles": 15
    }
  ]
}
```

---

## Charger un JSON existant dans l'éditeur

1. Cliquez sur **📂 Charger** dans la barre d'outils
2. Sélectionnez votre fichier `.json` (doit avoir `"type": "image-map"`)
3. La composition est restaurée dans l'éditeur

---

## Utiliser la map en session

### Étape 1 — Placer le fichier JSON dans le projet

Copiez le fichier téléchargé dans :

```
client/public/maps/nom-de-la-map.json
```

### Étape 2 — Déclarer la map dans l'index

Ouvrez `client/public/maps/index.json` et ajoutez une entrée :

```json
{
  "maps": [
    { "id": "grande-salle", "label": "Grande Salle", "type": "tiled" },
    { "id": "ma-map",       "label": "Ma Map",       "type": "image-map" }
  ],
  "defaultMap": "grande-salle"
}
```

> **Important :** Le champ `"type": "image-map"` est indispensable pour que `DungeonScene` charge l'image-map au lieu d'essayer de l'interpréter comme une map Tiled.

### Étape 3 — Relancer le serveur et charger la map

1. Relancez le serveur (`npm start` ou `start.bat`) pour servir le nouveau fichier
2. Dans la session, ouvrez le **Panneau GM**
3. Sélectionnez votre map dans le sélecteur et cliquez **Charger cette map**
4. La map se charge pour tous les clients connectés

---

## Retourner au donjon

Cliquez sur **🎮 Retour au donjon** dans la barre d'outils de l'éditeur.

La palette et la barre d'outils sont automatiquement supprimées du DOM, et la `DungeonScene` reprend.

---

## Conseils de composition

- **Laissez des espaces entre les salles** pour placer des couloirs
- **Utilisez `defaultWidthInTiles` / `defaultHeightInTiles`** pour contrôler la taille d'affichage dans l'éditeur — l'image est automatiquement redimensionnée pour couvrir exactement ce nombre de cases (ex. `20` cases × 64 px/case = 1280 px)
- **Nommez vos maps** de façon descriptive : `donjon-niveau-1`, `taverne`, `foret-nord`
- **La grille est 80×60 cases** à 64 px = 5120×3840 px maximum — amplement suffisant pour une session
- **Superposez les images** : une salle peut chevaucher une autre, la dernière placée s'affiche au-dessus

---

## Dépannage

| Problème | Cause probable | Solution |
|----------|----------------|----------|
| La palette est vide | `images/index.json` introuvable ou mal formé | Vérifier le chemin et la syntaxe JSON |
| L'image ne s'affiche pas dans la palette | Chemin `file` incorrect dans `index.json` | Vérifier que le PNG est bien dans `client/public/images/` |
| La map n'apparaît pas dans le sélecteur GM | Entrée manquante dans `maps/index.json` | Ajouter l'entrée avec `"type": "image-map"` |
| La map charge en blanc | Le fichier JSON est manquant dans `client/public/maps/` | Copier le fichier téléchargé au bon endroit |
| Erreur "type invalide" au chargement | Le JSON n'a pas `"type": "image-map"` | Vérifier le contenu du JSON |
