import { network } from "../network/ColyseusClient";
import type { Token } from "../../../server/src/schema/DungeonState";
import { GMPanel } from "../ui/GMPanel";
import { DebugPanel } from "../ui/DebugPanel";
import type { ImageMapData, MapIndex, MapIndexEntry } from "../types/MapTypes";

// Taille d'une case en pixels — correspond aux tuiles 16×16 du tileset 0x72 Dungeon
// (équivalent du Grid Cell Size dans Unity)
const TILE_SIZE = 16;

// Zoom initial appliqué à la caméra pour que les tuiles 16px soient lisibles à l'écran
// (équivalent de Camera.orthographicSize Unity)
const INITIAL_ZOOM = 2.5;

// Map par défaut utilisée si l'index est vide ou l'état Colyseus non initialisé
const DEFAULT_MAP_NAME = "grande-salle";

// Rayon du cercle de portée en cases (bonus feature 4)
const RANGE_CIRCLE_TILES = 6;

// DungeonScene — scène de jeu principale
// Équivalent d'une GameScene Unity avec GameObjects synchronisés via Colyseus
export class DungeonScene extends Phaser.Scene {

  // Map des containers de tokens : tokenId → Container Phaser
  // Équivalent d'un Dictionary<string, GameObject> Unity
  private tokenSprites: Map<string, Phaser.GameObjects.Container> = new Map();

  // Container Phaser regroupant tous les tokens — assure qu'ils restent au-dessus des layers carte
  private tokenContainer!: Phaser.GameObjects.Container;

  // Layers de la carte courante (conservés pour pouvoir les détruire lors d'un changement)
  private currentMapLayers: Phaser.Tilemaps.TilemapLayer[] = [];
  private currentTilemap: Phaser.Tilemaps.Tilemap | null = null;

  // Sprites des images placées pour les image-maps (détruits lors d'un changement de map)
  private currentImageSprites: Phaser.GameObjects.Image[] = [];

  // Grille superposée à la carte (unifiée Tiled + image-map)
  private gridGraphics: Phaser.GameObjects.Graphics | null = null;

  // Échelle locale (mètres par case) — synchronisée depuis l'état Colyseus
  private tileScale: number = 1.5;

  // Outil de mesure Shift+clic-glisser
  private isMeasuring: boolean = false;
  private measureStart: { tileX: number; tileY: number } | null = null;
  private measureGraphics: Phaser.GameObjects.Graphics | null = null;
  private measureLabel: Phaser.GameObjects.Text | null = null;

  // Cercle de portée affiché sur le token sélectionné (bonus)
  private rangeCircle: Phaser.GameObjects.Graphics | null = null;

  // Panneau GM (HTML overlay) — null si le joueur n'est pas GM
  private gmPanel: GMPanel | null = null;

  // Panneau de debug (HTML overlay) — toggle avec la touche `
  private debugPanel: DebugPanel | null = null;

  // État du scroll caméra via clic droit
  private isDragging: boolean = false;
  private dragStartX: number  = 0;
  private dragStartY: number  = 0;
  private camStartX:  number  = 0;
  private camStartY:  number  = 0;

  constructor() {
    super({ key: "DungeonScene" });
  }

  // ── Chargement des assets ────────────────────────────────────────��───────
  // Équivalent d'un AssetDatabase Unity — chargé avant le create()
  preload(): void {
    // Le tileset est toujours requis — ne pas recharger s'il est déjà en cache
    if (!this.textures.exists("0x72_dungeon")) {
      this.load.image("0x72_dungeon", "tilesets/0x72_dungeon.png");
    }

    // Pré-charger uniquement les maps Tiled listées dans l'index (chargé par BootScene)
    // Les image-maps (type: "image-map") sont chargées dynamiquement via fetch dans _loadImageMap()
    // et ne doivent PAS être parsées comme Tiled JSON — cela générerait des erreurs en console
    const mapsIndex = this.cache.json.get("maps-index") as MapIndex | null;
    const maps: MapIndexEntry[] = mapsIndex?.maps ?? [{ id: DEFAULT_MAP_NAME }];

    maps.forEach((m) => {
      // Ignorer les image-maps — elles utilisent fetch + Phaser.load.image() dynamiquement
      if ((m.type ?? "tiled") === "image-map") return;

      // Ne pas recharger si déjà présent (évite les erreurs Phaser de double chargement)
      if (!this.cache.tilemap.exists(m.id)) {
        this.load.tilemapTiledJSON(m.id, `maps/${m.id}.json`);
      }
    });
  }

  create(): void {
    // ── Container de tokens ──────────────────────────────────────────────────
    // Créé en premier pour que les layers carte soient insérés en dessous
    this.tokenContainer = this.add.container(0, 0);
    this.tokenContainer.setDepth(10);

    // ── Zoom initial ─────────────────────────────────────────────────────────
    this.cameras.main.setZoom(INITIAL_ZOOM);

    // ── Outils de mesure (créés une seule fois, cachés par défaut) ───────────
    this.measureGraphics = this.add.graphics();
    this.measureGraphics.setDepth(20);
    this.measureGraphics.setVisible(false);

    this.measureLabel = this.add.text(0, 0, "", {
      fontSize:        "13px",
      color:           "#ffffff",
      fontFamily:      "monospace",
      backgroundColor: "rgba(0,0,0,0.6)",
      padding:         { x: 4, y: 2 },
    }).setDepth(20).setVisible(false).setOrigin(0.5, 0.5);

    // ── Cercle de portée (bonus) ──────────────────────────────────────────────
    this.rangeCircle = this.add.graphics();
    this.rangeCircle.setDepth(8);
    this.rangeCircle.setVisible(false);

    // ── Charger la map initiale depuis l'état Colyseus ───────────────────────
    const initialMap = network.room.state.currentMap ?? DEFAULT_MAP_NAME;
    this._loadMap(initialMap);

    // ── Écouter les changements de map (delta Colyseus) ──────────────────────
    network.room.state.listen("currentMap", (newMap: string) => {
      console.log(`[MAP] Changement de map → ${newMap}`);
      this._loadMap(newMap);
      this.gmPanel?.updateCurrentMap(newMap);
    });

    // ── Synchroniser l'échelle locale depuis Colyseus ────────────────────────
    this.tileScale = network.room.state.tileScale;
    network.room.state.listen("tileScale", (newScale: number) => {
      this.tileScale = newScale;
    });

    // ── Synchronisation des tokens Colyseus ─────────────────────────────────
    this._syncTokens();

    // ── Panneau GM (overlay HTML) — uniquement si l'utilisateur est GM ───────
    if (network.isGM) {
      const mapsIndex = this.cache.json.get("maps-index");
      const mapsData: Array<{ id: string; label?: string }> = mapsIndex?.maps ?? [];

      this.gmPanel = new GMPanel(
        mapsData,
        network.room.state.currentMap,
        (mapName) => network.loadMap(mapName),
        (fog, los) => network.toggleFog(fog, los),
        (action) => network.combat(action),
        (scale) => network.setTileScale(scale),
        (tokenId, hp) => network.updateHp(tokenId, hp),
        network.room.state.players,
        network.room.state.tokens,
        (visible) => this.setGridVisible(visible),
        network.room.state.tileScale,
      );

      // Mettre à jour la liste des joueurs lorsqu'un joueur rejoint ou quitte la room
      network.room.state.players.onAdd((_player, _sessionId) => {
        this.gmPanel?.updatePlayers();
      });
      network.room.state.players.onRemove((_player, _sessionId) => {
        this.gmPanel?.updatePlayers();
      });
    }

    // ── Panneau de debug (overlay HTML) — toggle avec la touche ` ────────────
    this.debugPanel = new DebugPanel(network.room, network.isGM);

    // ── Gestion des inputs ──────────────────────────────────────────────────
    this._setupInput();
  }

  // ── Chargement / rechargement dynamique d'une map ───────────────────────
  // Supporte les formats "tiled" et "image-map" (Phase 1c)
  private _loadMap(mapName: string): void {
    // Nettoyer l'ancienne carte Tiled
    this.currentMapLayers.forEach((layer) => layer.destroy());
    this.currentMapLayers = [];
    this.currentTilemap?.destroy();
    this.currentTilemap = null;

    // Nettoyer les images d'une image-map précédente
    this.currentImageSprites.forEach((s) => s.destroy());
    this.currentImageSprites = [];

    // Détruire la grille précédente (unifiée Tiled + image-map)
    this.gridGraphics?.destroy();
    this.gridGraphics = null;

    // Déterminer le type de map depuis maps/index.json
    const mapsIndex = this.cache.json.get("maps-index") as MapIndex | null;
    const entry     = mapsIndex?.maps.find((m) => m.id === mapName);
    const mapType   = entry?.type ?? "tiled";

    if (mapType === "image-map") {
      void this._loadImageMap(mapName);
    } else {
      this._loadTiledMap(mapName);
    }
  }

  // ── Chargement d'une map Tiled ───────────────────────────────────────────
  private _loadTiledMap(mapName: string): void {
    // Créer la nouvelle tilemap depuis le cache Phaser
    const map = this.make.tilemap({ key: mapName });
    this.currentTilemap = map;

    const tileset = map.addTilesetImage("0x72_dungeon", "0x72_dungeon");
    if (!tileset) {
      console.error(`[MAP] Tileset introuvable pour la map "${mapName}". Vérifiez client/public/tilesets/0x72_dungeon.png.`);
      return;
    }

    // Créer les layers (sol d'abord, murs au-dessus)
    const solLayer = map.createLayer("sol", tileset, 0, 0);
    const murLayer = map.createLayer("murs", tileset, 0, 0);

    if (solLayer) {
      this.currentMapLayers.push(solLayer);
    }

    if (murLayer) {
      murLayer.setCollisionByExclusion([-1]);
      this.currentMapLayers.push(murLayer);
    } else {
      console.warn(`[MAP] Layer "murs" introuvable dans la map "${mapName}".`);
    }

    // S'assurer que le container de tokens reste au-dessus des layers
    this.tokenContainer.setDepth(10);

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    // Rétablir le zoom initial adapté aux tuiles 16 px
    this.cameras.main.setZoom(INITIAL_ZOOM);

    // Dessiner la grille par-dessus la carte Tiled (pas = 16 px = TILE_SIZE)
    this._drawGrid(map.widthInPixels, map.heightInPixels);
  }

  // ── Chargement d'une image-map (format Phase 1c) ─────────────────────────
  private async _loadImageMap(mapName: string): Promise<void> {
    try {
      const response = await fetch(`maps/${mapName}.json`);
      if (!response.ok) {
        console.error(`[MAP] Impossible de charger l'image-map "${mapName}" (HTTP ${response.status}).`);
        return;
      }
      const data = await response.json() as ImageMapData;

      if (data.type !== "image-map") {
        console.error(`[MAP] Le fichier "${mapName}.json" n'est pas une image-map valide.`);
        return;
      }

      const tileSize  = data.tileSize ?? 64;
      const mapWidth  = data.widthInTiles  * tileSize;
      const mapHeight = data.heightInTiles * tileSize;

      // Charger et placer chaque image
      for (const placed of data.images) {
        const textureKey = `imgmap_${placed.src}`;

        await new Promise<void>((resolve) => {
          const doCreate = () => {
            const sprite = this.add.image(
              placed.x * tileSize,
              placed.y * tileSize,
              textureKey,
            ).setOrigin(0, 0);
            sprite.setDisplaySize(placed.widthInTiles * tileSize, placed.heightInTiles * tileSize);
            sprite.setDepth(0);
            this.currentImageSprites.push(sprite);
            resolve();
          };

          if (this.textures.exists(textureKey)) {
            doCreate();
          } else {
            this.load.image(textureKey, placed.src);
            this.load.once("complete", doCreate);
            this.load.start();
          }
        });
      }

      // Dessiner la grille par-dessus les images (pas = tileSize de la map)
      this._drawGrid(mapWidth, mapHeight, tileSize);

      // Les tokens doivent rester au-dessus
      this.tokenContainer.setDepth(10);

      // Bornes caméra
      this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);

      // Zoom adapté aux grandes image-maps (tuiles 64 px) — le joueur peut zoomer/dézoomer
      this.cameras.main.setZoom(0.5);

      console.log(`[MAP] Image-map "${mapName}" chargée (${data.images.length} images, ${data.widthInTiles}×${data.heightInTiles} cases).`);
    } catch (err) {
      console.error(`[MAP] Erreur lors du chargement de l'image-map "${mapName}" :`, err);
    }
  }

  // ── Grille unifiée ──────────────────────────────────────────────────────
  // Dessine une grille tous les `step` pixels par-dessus la carte active.
  // Depth 5 : au-dessus de la carte (0–2), sous les tokens (10).
  // step = TILE_SIZE (16) pour les maps Tiled, tileSize (64) pour les image-maps.
  private _drawGrid(widthPx: number, heightPx: number, step: number = TILE_SIZE): void {
    const g = this.add.graphics();
    this.gridGraphics = g;
    g.lineStyle(1, 0x444466, 0.25);
    for (let x = 0; x <= widthPx; x += step) {
      g.moveTo(x, 0);
      g.lineTo(x, heightPx);
    }
    for (let y = 0; y <= heightPx; y += step) {
      g.moveTo(0,       y);
      g.lineTo(widthPx, y);
    }
    g.strokePath();
    g.setDepth(5);
  }

  // Active ou masque la grille — appelé par le toggle GMPanel
  public setGridVisible(visible: boolean): void {
    this.gridGraphics?.setVisible(visible);
  }

  // ── Outil de mesure ─────────────────────────────────────────────────────
  // Redessine la ligne de mesure et met à jour le label flottant.
  private _updateMeasure(endTileX: number, endTileY: number): void {
    if (!this.measureStart || !this.measureGraphics || !this.measureLabel) return;

    const startX = this.measureStart.tileX * TILE_SIZE + TILE_SIZE / 2;
    const startY = this.measureStart.tileY * TILE_SIZE + TILE_SIZE / 2;
    const endX   = endTileX * TILE_SIZE + TILE_SIZE / 2;
    const endY   = endTileY * TILE_SIZE + TILE_SIZE / 2;

    // Distance Chebyshev (diagonale = 1 case, standard VTT)
    const dX = Math.abs(endTileX - this.measureStart.tileX);
    const dY = Math.abs(endTileY - this.measureStart.tileY);
    const distCases = Math.max(dX, dY);
    const distMetres = (distCases * this.tileScale).toFixed(1);

    // Redessiner la ligne avec cercles aux extrémités
    this.measureGraphics.clear();
    this.measureGraphics.lineStyle(2, 0xffff00, 0.85);
    this.measureGraphics.beginPath();
    this.measureGraphics.moveTo(startX, startY);
    this.measureGraphics.lineTo(endX, endY);
    this.measureGraphics.strokePath();
    this.measureGraphics.fillStyle(0xffff00, 0.85);
    this.measureGraphics.fillCircle(startX, startY, 4);
    this.measureGraphics.fillCircle(endX, endY, 4);
    this.measureGraphics.setVisible(true);

    // Mettre à jour le label au milieu du segment
    this.measureLabel.setText(`${distCases} cases — ${distMetres} m`);
    this.measureLabel.setPosition((startX + endX) / 2, (startY + endY) / 2);
    this.measureLabel.setVisible(true);
  }

  // Efface l'outil de mesure (relâchement du bouton ou de Shift)
  private _stopMeasure(): void {
    this.isMeasuring = false;
    this.measureStart = null;
    this.measureGraphics?.clear();
    this.measureGraphics?.setVisible(false);
    this.measureLabel?.setVisible(false);
  }

  // ── Cercle de portée (bonus) ─────────────────────────────────────────────
  // Retourne le premier token trouvé à la case (tileX, tileY), ou null.
  private _getTokenAtTile(tileX: number, tileY: number): Token | null {
    let found: Token | null = null;
    network.room.state.tokens.forEach((token: Token) => {
      if (token.tileX === tileX && token.tileY === tileY) found = token;
    });
    return found;
  }

  // Affiche le cercle de portée (rayon 6 cases) autour d'une case.
  private _showRangeCircle(tileX: number, tileY: number): void {
    if (!this.rangeCircle) return;
    const centerX  = tileX * TILE_SIZE + TILE_SIZE / 2;
    const centerY  = tileY * TILE_SIZE + TILE_SIZE / 2;
    const radiusPx = RANGE_CIRCLE_TILES * TILE_SIZE;
    this.rangeCircle.clear();
    this.rangeCircle.fillStyle(0x00aaff, 0.2);
    this.rangeCircle.fillCircle(centerX, centerY, radiusPx);
    this.rangeCircle.lineStyle(1.5, 0x00aaff, 0.7);
    this.rangeCircle.strokeCircle(centerX, centerY, radiusPx);
    this.rangeCircle.setVisible(true);
  }

  // ── Synchronisation Colyseus → Phaser ───────────────────────────────────
  private _syncTokens(): void {
    const { tokens } = network.room.state;

    // Ajout d'un token existant ou nouveau — équivalent d'un OnNetworkSpawn Unity
    tokens.onAdd((token: Token, tokenId: string) => {
      this._createTokenSprite(tokenId, token);

      // Écoute les changements de position → tween de déplacement
      // Équivalent d'un NetworkTransform Unity avec interpolation
      token.listen("tileX", () => this._tweenToken(tokenId, token));
      token.listen("tileY", () => this._tweenToken(tokenId, token));

      // Écoute les changements de HP → mise à jour du label
      token.listen("hp", (newHp: number) => {
        const container = this.tokenSprites.get(tokenId);
        if (!container) return;
        const hpLabel = container.getAt(2) as Phaser.GameObjects.Text;
        hpLabel.setText(`${newHp}/${token.hpMax}`);
      });
    });

    // Suppression d'un token — équivalent d'un OnNetworkDespawn Unity
    tokens.onRemove((_token: Token, tokenId: string) => {
      const container = this.tokenSprites.get(tokenId);
      if (container) {
        container.destroy();
        this.tokenSprites.delete(tokenId);
      }
    });
  }

  // Crée le container Phaser pour un token : cercle + nom + HP
  private _createTokenSprite(tokenId: string, token: Token): void {
    const x = token.tileX * TILE_SIZE + TILE_SIZE / 2;
    const y = token.tileY * TILE_SIZE + TILE_SIZE / 2;

    // Cercle coloré représentant le pion
    const color  = Phaser.Display.Color.HexStringToColor(token.color ?? "#ffffff").color;
    const circle = this.add.circle(0, 0, TILE_SIZE * 0.4, color);

    // Label nom au-dessus du cercle
    const nameLabel = this.add.text(0, -TILE_SIZE * 0.55, token.name ?? "", {
      fontSize:   "11px",
      color:      "#ffffff",
      fontFamily: "monospace",
      stroke:     "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5, 1);

    // Label HP en dessous du cercle
    const hpLabel = this.add.text(0, TILE_SIZE * 0.55, `${token.hp}/${token.hpMax}`, {
      fontSize:   "11px",
      color:      "#88ff88",
      fontFamily: "monospace",
      stroke:     "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5, 0);

    // Regrouper les éléments dans un container et l'ajouter au tokenContainer
    // Le tokenContainer a setDepth(10) — les tokens restent toujours au-dessus des layers carte
    const container = this.add.container(x, y, [circle, nameLabel, hpLabel]);
    this.tokenContainer.add(container);

    this.tokenSprites.set(tokenId, container);
  }

  // Lance un tween de déplacement vers la nouvelle position de tuile
  private _tweenToken(tokenId: string, token: Token): void {
    const container = this.tokenSprites.get(tokenId);
    if (!container) return;

    const targetX = token.tileX * TILE_SIZE + TILE_SIZE / 2;
    const targetY = token.tileY * TILE_SIZE + TILE_SIZE / 2;

    this.tweens.add({
      targets:  container,
      x:        targetX,
      y:        targetY,
      duration: 150,
      ease:     "Linear",
    });
  }

  // ── Gestion des inputs ───────────────────────────────────────────────────
  private _setupInput(): void {
    // ── Clic gauche → mesure / cercle portée / déplacement ─────────────────
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        // Ignorer les clics qui proviennent du GMPanel (évite un moveToken parasite)
        if (pointer.event.target instanceof HTMLElement && pointer.event.target.closest("#gm-panel")) return;

        // pointer.worldX / pointer.worldY tient compte du scale CSS (Phaser.Scale.FIT),
        // du zoom caméra et du scroll — contrairement à pointer.x / pointer.y.
        const tileX = Math.floor(pointer.worldX / TILE_SIZE);
        const tileY = Math.floor(pointer.worldY / TILE_SIZE);

        // Shift + clic gauche → démarrer la mesure (ne déplace pas le token)
        if (pointer.event.shiftKey) {
          this.isMeasuring = true;
          this.measureStart = { tileX, tileY };
          return;
        }

        // Clic sur un token existant → afficher le cercle de portée
        const clickedToken = this._getTokenAtTile(tileX, tileY);
        if (clickedToken) {
          this._showRangeCircle(clickedToken.tileX, clickedToken.tileY);
          return;
        }

        // Clic sur case vide → déplacer le token + effacer le cercle de portée
        this.rangeCircle?.setVisible(false);
        this.rangeCircle?.clear();
        network.moveToken(network.room.sessionId, tileX, tileY);
      }

      // ── Clic droit → début du scroll caméra ────────────────────────────
      if (pointer.rightButtonDown()) {
        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        this.camStartX  = this.cameras.main.scrollX;
        this.camStartY  = this.cameras.main.scrollY;
      }
    });

    // ── Déplacement de la souris ──────────────────────────────────────────
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      // Mise à jour de la ligne de mesure si l'outil est actif
      if (this.isMeasuring && this.measureStart) {
        const endTileX = Math.floor(pointer.worldX / TILE_SIZE);
        const endTileY = Math.floor(pointer.worldY / TILE_SIZE);
        this._updateMeasure(endTileX, endTileY);
      }

      // Scroll caméra si clic droit enfoncé
      if (!this.isDragging) return;
      const dx = (pointer.x - this.dragStartX) / this.cameras.main.zoom;
      const dy = (pointer.y - this.dragStartY) / this.cameras.main.zoom;
      this.cameras.main.setScroll(this.camStartX - dx, this.camStartY - dy);
    });

    // ── Relâchement du clic → fin du scroll / de la mesure ─────────────────
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonReleased()) {
        this.isDragging = false;
      }
      if (pointer.leftButtonReleased() && this.isMeasuring) {
        this._stopMeasure();
      }
    });

    // ── Relâchement de Shift → fin de la mesure ────────────────────────────
    this.input.keyboard?.on("keyup-SHIFT", () => {
      if (this.isMeasuring) this._stopMeasure();
    });

    // ── Molette → zoom (clampé entre 0.3 et 2.5) ──────────────────────────
    // Équivalent d'un Camera.orthographicSize Unity
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gameObjects: unknown, _dx: number, dy: number) => {
      const zoom    = this.cameras.main.zoom;
      const newZoom = Phaser.Math.Clamp(zoom - dy * 0.001, 0.3, 2.5);
      this.cameras.main.setZoom(newZoom);
    });
  }

  // ── Nettoyage lors du déchargement de la scène ────────────────────────────
  // Appelé par Phaser quand la scène est arrêtée (ex: passage à MapEditorScene)
  // S'abonne à l'événement shutdown Phaser pour détruire les overlays HTML
  shutdown(): void {
    this.gmPanel?.destroy();
    this.gmPanel = null;
    this.debugPanel?.destroy();
    this.debugPanel = null;
  }
}