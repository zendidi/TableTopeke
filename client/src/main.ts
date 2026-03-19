import Phaser from "phaser";
import { BootScene }    from "./scenes/BootScene";
import { LobbyScene }   from "./scenes/LobbyScene";
import { DungeonScene } from "./scenes/DungeonScene";

// Point d'entrée de l'application — équivalent du bootstrap Unity
const config: Phaser.Types.Core.GameConfig = {
  type:            Phaser.AUTO,
  width:           1280,
  height:          720,
  backgroundColor: "#1a1a2e",
  parent:          "game-container",
  pixelArt:        true,
  scene:           [BootScene, LobbyScene, DungeonScene],
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

new Phaser.Game(config);
