// BootScene — chargement des assets et configuration initiale
// Équivalent du SplashScreen / LoadingScene d'Unity
export class BootScene extends Phaser.Scene {

  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    const { width, height } = this.scale;
    const cx = width  / 2;
    const cy = height / 2;

    // ── Titre du projet ─────────────────────────────────────────────────────
    this.add.text(cx, cy - 80, "⚔️  TableTopeke", {
      fontSize:   "42px",
      color:      "#c9a96e",
      fontFamily: "serif",
    }).setOrigin(0.5);

    // ── Texte de chargement ─────────────────────────────────────────────────
    const loadingText = this.add.text(cx, cy + 20, "Chargement...", {
      fontSize:   "18px",
      color:      "#aaaaaa",
      fontFamily: "monospace",
    }).setOrigin(0.5);

    // ── Barre de progression ────────────────────────────────────────────────
    const barBg = this.add.rectangle(cx, cy + 60, 400, 20, 0x333355);
    const bar   = this.add.rectangle(cx - 200, cy + 60, 0, 18, 0x6060cc).setOrigin(0, 0.5);

    this.load.on("progress", (value: number) => {
      bar.width = 400 * value;
      loadingText.setText(`Chargement... ${Math.floor(value * 100)}%`);
    });

    this.load.on("complete", () => {
      loadingText.setText("Prêt !");
      barBg.destroy();
      bar.destroy();
    });

    // ── Chargement de la config joueur locale ────────────────────────────────
    // Chaque joueur place son player-config.json dans client/public/
    // (voir player-config.example.json pour le template)
    this.load.json("player-config", "player-config.json");

    // ── Chargement de l'index des maps ───────────────────────────────────────
    // Source de vérité pour la liste des maps disponibles (sélecteur GM Phase 1b)
    this.load.json("maps-index", "maps/index.json");
  }

  create(): void {
    // Transition vers le lobby dès que tout est chargé
    this.scene.start("LobbyScene");
  }
}
