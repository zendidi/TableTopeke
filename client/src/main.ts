import Phaser from "phaser";
import { BootScene }      from "./scenes/BootScene";
import { LobbyScene }     from "./scenes/LobbyScene";
import { DungeonScene }   from "./scenes/DungeonScene";
import { MapEditorScene } from "./scenes/MapEditorScene";

// Extension globale de Window pour exposer l'instance Phaser aux overlays HTML
// et la configuration joueur en cas d'intégration externe
declare global {
  interface Window {
    __phaserGame: Phaser.Game;
    // Dernier message d'erreur — exposé par DebugOverlay.setLastError()
    __lastError?: string;
    // Configuration joueur optionnelle — peut être définie par une page hôte
    // avant le chargement de l'application (priorité sur player-config.json)
    __playerConfig?: {
      name?: string;
      color?: string;
      avatarUrl?: string;
      hp?: number;
      hpMax?: number;
      isGM?: boolean;
      gmPassword?: string;
    };
  }
}

// Point d'entrée de l'application — équivalent du bootstrap Unity
const config: Phaser.Types.Core.GameConfig = {
  type:            Phaser.AUTO,
  width:           1280,
  height:          720,
  backgroundColor: "#1a1a2e",
  parent:          "game-container",
  pixelArt:        true,
  scene:           [BootScene, LobbyScene, DungeonScene, MapEditorScene],
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

// Exposer l'instance Phaser pour permettre aux overlays HTML (GMPanel, etc.) de changer de scène
window.__phaserGame = new Phaser.Game(config);

window.addEventListener("error", (e) =>
  console.error("[WINDOW ERROR]", e.message, `${e.filename}:${e.lineno}`));
window.addEventListener("unhandledrejection", (e) =>
  console.error("[PROMISE REJECTED]", e.reason));
