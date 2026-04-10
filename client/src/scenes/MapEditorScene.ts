// MapEditorScene — éditeur de map par images, accessible uniquement au GM
// Permet de composer une grande map en plaçant des images PNG sur une grille
// Équivalent d'un éditeur de niveaux Unity custom (EditorWindow)

import { network } from "../network/ColyseusClient";
import { ImagePalette } from "../ui/ImagePalette";
import type { PlacedImage, ImageMapData } from "../types/MapTypes";

// Taille d'une case dans l'éditeur (pixels)
const EDITOR_TILE_SIZE = 64;

// Dimensions de la grille de l'éditeur en cases
const GRID_WIDTH  = 80;
const GRID_HEIGHT = 60;

// Préfixe pour les clés de texture des images de map — partagé avec DungeonScene
const IMAGE_TEXTURE_KEY_PREFIX = "imgmap_";

export class MapEditorScene extends Phaser.Scene {
  private placedImages: PlacedImage[]  = [];
  private placedSprites: Map<string, Phaser.GameObjects.Image>      = new Map();
  private selectionRects: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  private selectedId: string | null    = null;
  private mapName: string              = "nouvelle-map";

  // Compteur pour générer des IDs uniques sans collision de timestamp
  private _nextImageId: number = 0;

  // Drag caméra (clic droit)
  private isDragging: boolean = false;
  private dragStartX: number  = 0;
  private dragStartY: number  = 0;
  private camStartX:  number  = 0;
  private camStartY:  number  = 0;

  // Mode placement : imageId en attente d'être placé sur la grille
  private pendingImageId: string | null = null;

  // Drag d'image placée (clic gauche)
  private isDraggingImage: boolean = false;
  private draggingImageId: string | null = null;
  private dragOffsetTileX: number = 0;
  private dragOffsetTileY: number = 0;

  // Éléments HTML overlay
  private palette: ImagePalette | null  = null;
  private toolbar: HTMLDivElement | null = null;
  private statusLabel: HTMLSpanElement | null = null;
  private mapNameInput: HTMLInputElement | null = null;

  // Input file caché pour le chargement JSON
  private fileInput: HTMLInputElement | null = null;

  constructor() {
    super({ key: "MapEditorScene" });
  }

  // ── Pré-chargement ─────────────────────────────────────────────────────────
  preload(): void {
    // Charger l'index des images si pas déjà en cache
    if (!this.cache.json.exists("images-index")) {
      this.load.json("images-index", "images/index.json");
    }
  }

  // ── Initialisation de la scène ─────────────────────────────────────────────
  create(): void {
    // Vérification GM — seul le GM peut accéder à l'éditeur
    if (!network.isGM) {
      this.scene.start("DungeonScene");
      return;
    }

    // Fond noir
    this.cameras.main.setBackgroundColor("#0a0a12");

    // Grille de cases (lignes grises semi-transparentes)
    this._drawGrid();

    // Caméra — bornes et zoom
    this.cameras.main.setBounds(0, 0, GRID_WIDTH * EDITOR_TILE_SIZE, GRID_HEIGHT * EDITOR_TILE_SIZE);
    this.cameras.main.setZoom(0.5);

    // Palette d'images HTML
    const imagesIndex = this.cache.json.get("images-index") as { images: Array<{ id: string; label: string; file: string }> } | null;
    const imagesList  = imagesIndex?.images ?? [];
    this.palette = new ImagePalette(imagesList, (imageId) => {
      this._startPlacementMode(imageId);
    });

    // Barre d'outils HTML
    this._buildToolbar();

    // Gestion des inputs
    this._setupInput();
  }

  // ── Nettoyage à la destruction de la scène ─────────────────────────────────
  // Appelé automatiquement par Phaser quand on quitte la scène
  shutdown(): void {
    this.palette?.destroy();
    this.palette = null;
    this.toolbar?.remove();
    this.toolbar = null;
    this.fileInput?.remove();
    this.fileInput = null;
  }

  // ── Grille de l'éditeur ────────────────────────────────────────────────────
  private _drawGrid(): void {
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x333355, 0.5);

    for (let x = 0; x <= GRID_WIDTH; x++) {
      graphics.moveTo(x * EDITOR_TILE_SIZE, 0);
      graphics.lineTo(x * EDITOR_TILE_SIZE, GRID_HEIGHT * EDITOR_TILE_SIZE);
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
      graphics.moveTo(0,                             y * EDITOR_TILE_SIZE);
      graphics.lineTo(GRID_WIDTH * EDITOR_TILE_SIZE, y * EDITOR_TILE_SIZE);
    }
    graphics.strokePath();
  }

  // ── Barre d'outils HTML ────────────────────────────────────────────────────
  private _buildToolbar(): void {
    const bar = document.createElement("div");
    this.toolbar = bar;
    bar.id = "map-editor-toolbar";

    Object.assign(bar.style, {
      position:   "fixed",
      top:        "0",
      left:       "160px",
      right:      "0",
      height:     "50px",
      background: "rgba(20,20,40,0.95)",
      display:    "flex",
      alignItems: "center",
      gap:        "8px",
      padding:    "0 12px",
      zIndex:     "100",
      borderBottom: "2px solid #7b2d8b",
      fontFamily: "monospace",
      fontSize:   "13px",
      color:      "white",
      boxSizing:  "border-box",
    });

    // Libellé
    const lbl = document.createElement("span");
    lbl.textContent = "Nom :";
    bar.appendChild(lbl);

    // Champ nom de la map
    const nameInput = document.createElement("input");
    this.mapNameInput = nameInput;
    nameInput.type  = "text";
    nameInput.value = this.mapName;
    Object.assign(nameInput.style, {
      background:  "#1a1a2e",
      color:       "white",
      border:      "1px solid #7b2d8b",
      padding:     "4px 6px",
      fontFamily:  "monospace",
      fontSize:    "13px",
      borderRadius: "3px",
      width:       "160px",
    });
    nameInput.addEventListener("input", () => {
      this.mapName = nameInput.value.trim() || "nouvelle-map";
      this._markUnsaved();
    });
    bar.appendChild(nameInput);

    // Séparateur
    bar.appendChild(this._makeSeparator());

    // Bouton Sauvegarder
    bar.appendChild(this._makeButton("💾 Sauvegarder", "#2d8b2d", () => this._saveMap()));

    // Bouton Charger
    bar.appendChild(this._makeButton("📂 Charger", "#2d5a8b", () => this.fileInput?.click()));

    // Bouton Effacer tout
    bar.appendChild(this._makeButton("🗑️ Effacer tout", "#8b2d2d", () => this._clearAll()));

    // Bouton Retour au donjon
    bar.appendChild(this._makeButton("🎮 Retour au donjon", "#5a5a8b", () => {
      this.scene.start("DungeonScene");
    }));

    // Séparateur
    bar.appendChild(this._makeSeparator());

    // Label d'état
    const status = document.createElement("span");
    this.statusLabel = status;
    status.textContent = "✅ Prêt";
    Object.assign(status.style, { color: "#88ff88", fontSize: "12px" });
    bar.appendChild(status);

    document.body.appendChild(bar);

    // Input file caché pour le chargement JSON
    const fileInput = document.createElement("input");
    this.fileInput = fileInput;
    fileInput.type   = "file";
    fileInput.accept = ".json,application/json";
    fileInput.style.display = "none";
    fileInput.addEventListener("change", () => {
      if (fileInput.files && fileInput.files.length > 0) {
        void this._loadMapFromFile(fileInput.files[0]);
        fileInput.value = ""; // Réinitialiser pour permettre de recharger le même fichier
      }
    });
    document.body.appendChild(fileInput);
  }

  // ── Helpers barre d'outils ─────────────────────────────────────────────────
  private _makeButton(label: string, bg: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = label;
    Object.assign(btn.style, {
      background:   bg,
      color:        "white",
      border:       "none",
      padding:      "5px 10px",
      cursor:       "pointer",
      fontFamily:   "monospace",
      fontSize:     "12px",
      borderRadius: "3px",
      whiteSpace:   "nowrap",
    });
    btn.addEventListener("click", onClick);
    return btn;
  }

  private _makeSeparator(): HTMLDivElement {
    const sep = document.createElement("div");
    Object.assign(sep.style, {
      width:      "1px",
      height:     "28px",
      background: "#7b2d8b",
      margin:     "0 4px",
    });
    return sep;
  }

  // ── Gestion des inputs Phaser ──────────────────────────────────────────────
  private _setupInput(): void {
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      // Clic gauche — placer ou sélectionner/démarrer drag
      if (pointer.leftButtonDown()) {
        const { tileX, tileY } = this._snapToGrid(pointer.worldX, pointer.worldY);

        // Mode placement en attente
        if (this.pendingImageId !== null) {
          this._placeImage(this.pendingImageId, tileX, tileY);
          this.pendingImageId = null;
          this.palette?.setSelected(null);
          return;
        }

        // Vérifier si on clique sur une image placée
        const hitId = this._hitTest(pointer.worldX, pointer.worldY);
        if (hitId !== null) {
          this._selectImage(hitId);
          const placed = this.placedImages.find((p) => p.id === hitId);
          if (placed) {
            this.isDraggingImage  = true;
            this.draggingImageId  = hitId;
            this.dragOffsetTileX  = tileX - placed.x;
            this.dragOffsetTileY  = tileY - placed.y;
          }
        } else {
          this._selectImage(null);
        }
      }

      // Clic droit — supprimer l'image sous le curseur, ou démarrer scroll caméra
      if (pointer.rightButtonDown()) {
        const hitId = this._hitTest(pointer.worldX, pointer.worldY);

        if (hitId !== null) {
          this._removePlacedImage(hitId);
        } else {
          // Scroll caméra
          this.isDragging = true;
          this.dragStartX = pointer.x;
          this.dragStartY = pointer.y;
          this.camStartX  = this.cameras.main.scrollX;
          this.camStartY  = this.cameras.main.scrollY;
        }
      }
    });

    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      // Scroll caméra clic droit
      if (this.isDragging) {
        const dx = (pointer.x - this.dragStartX) / this.cameras.main.zoom;
        const dy = (pointer.y - this.dragStartY) / this.cameras.main.zoom;
        this.cameras.main.setScroll(this.camStartX - dx, this.camStartY - dy);
      }

      // Drag d'image placée
      if (this.isDraggingImage && this.draggingImageId !== null) {
        const { tileX, tileY } = this._snapToGrid(pointer.worldX, pointer.worldY);
        const newTileX = tileX - this.dragOffsetTileX;
        const newTileY = tileY - this.dragOffsetTileY;
        this._movePlacedImage(this.draggingImageId, newTileX, newTileY);
      }
    });

    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonReleased()) {
        this.isDragging = false;
      }
      if (!pointer.leftButtonDown()) {
        this.isDraggingImage  = false;
        this.draggingImageId  = null;
      }
    });

    // Molette → zoom (clampé 0.2 → 2.0)
    this.input.on("wheel", (
      _pointer: Phaser.Input.Pointer,
      _gameObjects: unknown,
      _dx: number,
      dy: number,
    ) => {
      const zoom    = this.cameras.main.zoom;
      const newZoom = Phaser.Math.Clamp(zoom - dy * 0.001, 0.2, 2.0);
      this.cameras.main.setZoom(newZoom);
    });
  }

  // ── Snap à la grille ───────────────────────────────────────────────────────
  private _snapToGrid(pixelX: number, pixelY: number): { tileX: number; tileY: number } {
    return {
      tileX: Math.floor(pixelX / EDITOR_TILE_SIZE),
      tileY: Math.floor(pixelY / EDITOR_TILE_SIZE),
    };
  }

  // ── Détection de hit sur les images placées ────────────────────────────────
  private _hitTest(worldX: number, worldY: number): string | null {
    // Parcourir à l'envers pour sélectionner l'image au premier plan
    for (let i = this.placedImages.length - 1; i >= 0; i--) {
      const p = this.placedImages[i];
      const left   = p.x * EDITOR_TILE_SIZE;
      const top    = p.y * EDITOR_TILE_SIZE;
      const right  = left + p.widthInTiles  * EDITOR_TILE_SIZE;
      const bottom = top  + p.heightInTiles * EDITOR_TILE_SIZE;
      if (worldX >= left && worldX <= right && worldY >= top && worldY <= bottom) {
        return p.id;
      }
    }
    return null;
  }

  // ── Mode placement en attente ──────────────────────────────────────────────
  private _startPlacementMode(imageId: string): void {
    this.pendingImageId = imageId;
    this._selectImage(null);
    if (this.statusLabel) {
      this.statusLabel.textContent = "🖱️ Cliquez sur la grille pour placer";
      this.statusLabel.style.color = "#ffcc00";
    }
  }

  // ── Placer une image sur la grille ─────────────────────────────────────────
  private _placeImage(imageId: string, tileX: number, tileY: number): void {
    const imagesIndex = this.cache.json.get("images-index") as {
      images: Array<{ id: string; file: string; defaultWidthInTiles: number; defaultHeightInTiles: number }>;
    } | null;
    const meta = imagesIndex?.images.find((i) => i.id === imageId);
    if (!meta) return;

    const placed: PlacedImage = {
      id:             `img_${this._nextImageId++}`,
      src:            `images/${meta.file}`,
      x:              tileX,
      y:              tileY,
      widthInTiles:   meta.defaultWidthInTiles,
      heightInTiles:  meta.defaultHeightInTiles,
    };

    this.placedImages.push(placed);
    this._renderPlacedImage(placed);
    this._markUnsaved();
  }

  // ── Rendre une image placée dans Phaser ────────────────────────────────────
  private _renderPlacedImage(placed: PlacedImage): void {
    const textureKey = `${IMAGE_TEXTURE_KEY_PREFIX}${placed.src}`;

    const doCreate = () => {
      const pixelX = placed.x * EDITOR_TILE_SIZE;
      const pixelY = placed.y * EDITOR_TILE_SIZE;
      const targetW = placed.widthInTiles  * EDITOR_TILE_SIZE;
      const targetH = placed.heightInTiles * EDITOR_TILE_SIZE;

      const sprite = this.add.image(pixelX, pixelY, textureKey).setOrigin(0, 0);

      // Redimensionner pour occuper exactement widthInTiles × heightInTiles cases
      sprite.setDisplaySize(targetW, targetH);

      // Rectangle de sélection (invisible par défaut)
      const selRect = this.add.rectangle(
        pixelX + targetW / 2,
        pixelY + targetH / 2,
        targetW,
        targetH,
        0x7b2d8b,
        0.25,
      ).setVisible(placed.id === this.selectedId);

      this.placedSprites.set(placed.id, sprite);
      this.selectionRects.set(placed.id, selRect);
    };

    if (this.textures.exists(textureKey)) {
      doCreate();
    } else {
      // Chargement dynamique de la texture
      this.load.image(textureKey, placed.src);
      this.load.once("complete", () => doCreate());
      this.load.start();
    }
  }

  // ── Déplacer une image placée ──────────────────────────────────────────────
  private _movePlacedImage(id: string, newTileX: number, newTileY: number): void {
    const placed = this.placedImages.find((p) => p.id === id);
    if (!placed) return;

    placed.x = Math.max(0, newTileX);
    placed.y = Math.max(0, newTileY);

    const sprite  = this.placedSprites.get(id);
    const selRect = this.selectionRects.get(id);
    const pixelX  = placed.x * EDITOR_TILE_SIZE;
    const pixelY  = placed.y * EDITOR_TILE_SIZE;
    const targetW = placed.widthInTiles  * EDITOR_TILE_SIZE;
    const targetH = placed.heightInTiles * EDITOR_TILE_SIZE;

    if (sprite) {
      sprite.setPosition(pixelX, pixelY);
    }
    if (selRect) {
      selRect.setPosition(pixelX + targetW / 2, pixelY + targetH / 2);
    }
  }

  // ── Sélectionner une image placée ─────────────────────────────────────────
  private _selectImage(id: string | null): void {
    this.selectedId = id;
    this.selectionRects.forEach((rect, rectId) => {
      rect.setVisible(rectId === id);
    });
  }

  // ── Supprimer une image placée ─────────────────────────────────────────────
  private _removePlacedImage(id: string): void {
    this.placedSprites.get(id)?.destroy();
    this.selectionRects.get(id)?.destroy();
    this.placedSprites.delete(id);
    this.selectionRects.delete(id);
    this.placedImages = this.placedImages.filter((p) => p.id !== id);
    if (this.selectedId === id) this.selectedId = null;
    this._markUnsaved();
  }

  // ── Effacer toutes les images placées ─────────────────────────────────────
  private _clearAll(): void {
    this.placedImages.forEach((p) => {
      this.placedSprites.get(p.id)?.destroy();
      this.selectionRects.get(p.id)?.destroy();
    });
    this.placedSprites.clear();
    this.selectionRects.clear();
    this.placedImages = [];
    this.selectedId   = null;
    this._markUnsaved();
  }

  // ── Sauvegarder la map en JSON (téléchargement navigateur) ─────────────────
  private _saveMap(): void {
    const mapData: ImageMapData = {
      id:            this.mapName,
      label:         this.mapName,
      type:          "image-map",
      widthInTiles:  GRID_WIDTH,
      heightInTiles: GRID_HEIGHT,
      tileSize:      EDITOR_TILE_SIZE,
      images:        [...this.placedImages],
    };

    const json  = JSON.stringify(mapData, null, 2);
    const blob  = new Blob([json], { type: "application/json" });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement("a");
    a.href      = url;
    a.download  = `${this.mapName}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this._markSaved();
    console.log(`[MapEditor] Map "${this.mapName}" sauvegardée (${this.placedImages.length} images).`);
  }

  // ── Charger une map depuis un fichier JSON ─────────────────────────────────
  private async _loadMapFromFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as Partial<ImageMapData>;

          if (data.type !== "image-map") {
            console.error("[MapEditor] Le fichier n'est pas une image-map valide (type manquant ou incorrect).");
            if (this.statusLabel) {
              this.statusLabel.textContent = "⚠️ Format invalide";
              this.statusLabel.style.color = "#ff6666";
            }
            resolve();
            return;
          }

          // Réinitialiser la scène
          this._clearAll();

          this.mapName = data.id ?? "nouvelle-map";
          if (this.mapNameInput) this.mapNameInput.value = this.mapName;

          const images = data.images ?? [];
          let loaded = 0;

          if (images.length === 0) {
            this._markSaved();
            resolve();
            return;
          }

          images.forEach((placed) => {
            const textureKey = `${IMAGE_TEXTURE_KEY_PREFIX}${placed.src}`;
            const doPlace = () => {
              this.placedImages.push(placed);
              this._renderPlacedImage(placed);
              loaded++;
              if (loaded === images.length) {
                // Mettre à jour _nextImageId pour éviter les collisions d'ID lors
                // des prochains placements (les IDs sont au format "img_N")
                const maxId = this.placedImages.reduce((max, p) => {
                  const match = p.id.match(/^img_(\d+)$/);
                  return match ? Math.max(max, parseInt(match[1], 10)) : max;
                }, -1);
                this._nextImageId = maxId + 1;
                this._markSaved();
                resolve();
              }
            };

            if (this.textures.exists(textureKey)) {
              doPlace();
            } else {
              this.load.image(textureKey, placed.src);
              this.load.once("complete", doPlace);
              this.load.start();
            }
          });
        } catch (err) {
          console.error("[MapEditor] Erreur de parsing JSON :", err);
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  // ── Labels d'état ──────────────────────────────────────────────────────────
  private _markSaved(): void {
    if (this.statusLabel) {
      this.statusLabel.textContent = "✅ Sauvegardé";
      this.statusLabel.style.color = "#88ff88";
    }
  }

  private _markUnsaved(): void {
    if (this.statusLabel) {
      this.statusLabel.textContent = "⚠️ Non sauvegardé";
      this.statusLabel.style.color = "#ffcc00";
    }
  }
}
