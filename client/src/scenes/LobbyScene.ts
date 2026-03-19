import { network } from "../network/ColyseusClient";

// Interface correspondant au contenu de player-config.json
interface PlayerConfig {
  name?: string;
  color?: string;
  avatarUrl?: string;
  hp?: number;
  hpMax?: number;
  isGM?: boolean;
  gmPassword?: string;
}

// LobbyScene — écran d'accueil avant d'entrer dans le donjon
// Équivalent d'un MenuScene Unity avec lobby réseau
export class LobbyScene extends Phaser.Scene {

  constructor() {
    super({ key: "LobbyScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width  / 2;
    const cy = height / 2;

    // ── Fond dégradé sombre ─────────────────────────────────────────────────
    this.add.rectangle(cx, cy, width, height, 0x1a1a2e);
    this.add.rectangle(cx, height - 2, width, 4, 0x6060cc);

    // ── Titre ───────────────────────────────────────────────────────────────
    this.add.text(cx, 120, "⚔️  TableTopeke", {
      fontSize:   "52px",
      color:      "#c9a96e",
      fontFamily: "serif",
    }).setOrigin(0.5);

    // ── Lecture de la config joueur depuis le cache Phaser ──────────────────
    const cfg: PlayerConfig = this.cache.json.get("player-config") ?? {};

    const playerName = cfg.name  ?? "Aventurier";
    const roleLabel  = cfg.isGM  ? "🎲 Game Master" : "⚔️ Joueur";
    const roleColor  = cfg.isGM  ? "#ff6666" : "#aaddff";

    this.add.text(cx, 230, playerName, {
      fontSize:   "28px",
      color:      cfg.color ?? "#ffffff",
      fontFamily: "sans-serif",
    }).setOrigin(0.5);

    this.add.text(cx, 275, roleLabel, {
      fontSize:   "18px",
      color:      roleColor,
      fontFamily: "monospace",
    }).setOrigin(0.5);

    // ── Bouton rejoindre ────────────────────────────────────────────────────
    const btnBg = this.add.rectangle(cx, cy + 60, 320, 56, 0x2a2a4e)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0x6060cc);

    const btnText = this.add.text(cx, cy + 60, "[ Rejoindre le Donjon ]", {
      fontSize:   "20px",
      color:      "#9999ee",
      fontFamily: "monospace",
    }).setOrigin(0.5);

    // Hover : éclaircit le bouton
    btnBg.on("pointerover",  () => { btnBg.setFillStyle(0x3a3a7e); btnText.setColor("#ccccff"); });
    btnBg.on("pointerout",   () => { btnBg.setFillStyle(0x2a2a4e); btnText.setColor("#9999ee"); });

    // ── Zone d'affichage des erreurs de connexion ────────────────────────────
    const errorText = this.add.text(cx, cy + 130, "", {
      fontSize:   "16px",
      color:      "#ff4444",
      fontFamily: "monospace",
    }).setOrigin(0.5);

    // ── Connexion au clic ───────────────────────────────────────────────────
    btnBg.on("pointerdown", async () => {
      btnBg.disableInteractive();
      btnText.setText("Connexion...");
      errorText.setText("");

      try {
        await network.connect(cfg);
        this.scene.start("DungeonScene");
      } catch (err) {
        console.error("[LobbyScene] Erreur de connexion:", err);
        const msg = err instanceof Error ? err.message : String(err);
        errorText.setText(`❌ Connexion échouée\n${msg}`);
        btnBg.setInteractive({ useHandCursor: true });
        btnText.setText("[ Rejoindre le Donjon ]");
      }
    });

    // ── Note de bas de page ─────────────────────────────────────────────────
    this.add.text(cx, height - 30, "Configurez player-config.json pour changer votre profil", {
      fontSize:   "12px",
      color:      "#555577",
      fontFamily: "monospace",
    }).setOrigin(0.5);
  }
}
