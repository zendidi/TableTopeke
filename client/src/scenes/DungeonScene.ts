import { network } from "../network/ColyseusClient";
import type { Token } from "../../../server/src/schema/DungeonState";

// Taille d'une case en pixels — correspond aux tuiles 16×16 du tileset 0x72 Dungeon
// (équivalent du Grid Cell Size dans Unity)
const TILE_SIZE = 16;

// Zoom initial appliqué à la caméra pour que les tuiles 16px soient lisibles à l'écran
// (équivalent de Camera.orthographicSize Unity)
const INITIAL_ZOOM = 2.5;

// DungeonScene — scène de jeu principale
// Équivalent d'une GameScene Unity avec GameObjects synchronisés via Colyseus
export class DungeonScene extends Phaser.Scene {

  // Map des containers de tokens : tokenId → Container Phaser
  // Équivalent d'un Dictionary<string, GameObject> Unity
  private tokenSprites: Map<string, Phaser.GameObjects.Container> = new Map();

  // État du scroll caméra via clic droit
  private isDragging: boolean = false;
  private dragStartX: number  = 0;
  private dragStartY: number  = 0;
  private camStartX:  number  = 0;
  private camStartY:  number  = 0;

  constructor() {
    super({ key: "DungeonScene" });
  }

  // ── Chargement des assets ────────────────────────────────────────────────
  // Équivalent d'un AssetDatabase Unity — chargé avant le create()
  preload(): void {
    this.load.image("0x72_dungeon", "tilesets/0x72_dungeon.png");
    this.load.tilemapTiledJSON("grande-salle", "maps/grande-salle.json");
  }

  create(): void {
    // ── Carte Tiled ──────────────────────────────────────────────────────────
    // Équivalent d'un Tilemap Unity chargé depuis un fichier .asset
    const map     = this.make.tilemap({ key: "grande-salle" });
    const tileset = map.addTilesetImage("0x72_dungeon", "0x72_dungeon");

    if (!tileset) {
      console.error("Impossible de charger le tileset 0x72_dungeon. Vérifiez client/public/tilesets/0x72_dungeon.png.");
      return;
    }

    // Layers dans l'ordre (sol en dessous, murs au-dessus)
    // Équivalent des Sorting Layers Unity
    map.createLayer("sol",  tileset, 0, 0);
    const murLayer = map.createLayer("murs", tileset, 0, 0);

    if (!murLayer) {
      console.error("Layer 'murs' introuvable dans la map chargée. Vérifiez que le layer est bien nommé 'murs' dans Tiled.");
      return;
    }

    // Collisions sur le layer murs — toutes les tuiles sauf les cases vides (-1)
    // Équivalent d'un TilemapCollider2D Unity
    murLayer.setCollisionByExclusion([-1]);

    // ── Caméra ──────────────────────────────────────────────────────────────
    // Borner la caméra aux dimensions réelles de la map — équivalent Cinemachine Confiner
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    // Zoom initial pour que les tuiles 16px soient lisibles
    this.cameras.main.setZoom(INITIAL_ZOOM);

    // ── Synchronisation des tokens Colyseus ─────────────────────────────────
    this._syncTokens();

    // ── Gestion des inputs ──────────────────────────────────────────────────
    this._setupInput();
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

    const container = this.add.container(x, y, [circle, nameLabel, hpLabel]);
    container.setDepth(1);

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
    // ── Clic gauche → déplacer le token du joueur courant ──────────────────
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        const worldX = this.cameras.main.scrollX + pointer.x / this.cameras.main.zoom;
        const worldY = this.cameras.main.scrollY + pointer.y / this.cameras.main.zoom;

        const tileX = Math.floor(worldX / TILE_SIZE);
        const tileY = Math.floor(worldY / TILE_SIZE);

        // Envoie la commande de déplacement pour le token du joueur courant
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

    // ── Déplacement de la souris → scroll caméra si clic droit enfoncé ────
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;

      const dx = (pointer.x - this.dragStartX) / this.cameras.main.zoom;
      const dy = (pointer.y - this.dragStartY) / this.cameras.main.zoom;

      this.cameras.main.setScroll(this.camStartX - dx, this.camStartY - dy);
    });

    // ── Relâchement du clic droit → fin du scroll ──────────────────────────
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonReleased()) {
        this.isDragging = false;
      }
    });

    // ── Molette → zoom (clampé entre 0.3 et 2.5) ──────────────────────────
    // Équivalent d'un Camera.orthographicSize Unity
    this.input.on("wheel", (_pointer: Phaser.Input.Pointer, _gameObjects: unknown, _dx: number, dy: number) => {
      const zoom    = this.cameras.main.zoom;
      const newZoom = Phaser.Math.Clamp(zoom - dy * 0.001, 0.3, 2.5);
      this.cameras.main.setZoom(newZoom);
    });
  }
}
