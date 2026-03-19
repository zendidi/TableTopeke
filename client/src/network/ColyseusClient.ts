import * as Colyseus from "colyseus.js";
import { DungeonState } from "../../../server/src/schema/DungeonState";

// Type pour les options de connexion (issues de player-config.json)
interface ConnectOptions {
  name?: string;
  color?: string;
  avatarUrl?: string;
  hp?: number;
  hpMax?: number;
  isGM?: boolean;
  gmPassword?: string;
}

// Singleton NetworkManager — équivalent d'un NetworkManager Unity
// Gère la connexion Colyseus et expose les méthodes d'envoi de messages
class NetworkManager {
  private static instance: NetworkManager;

  client!: Colyseus.Client;
  room!: Colyseus.Room<DungeonState>;
  isGM: boolean = false;

  private constructor() {}

  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  // Connexion au serveur et join/create de la room "dungeon"
  async connect(options: ConnectOptions): Promise<void> {
    // En développement on pointe vers localhost, en production vers le même host que le client
    const isDev    = window.location.hostname === "localhost";
    const hostname = isDev ? "localhost:2567" : window.location.hostname;
    const protocol = isDev ? "ws" : "wss";
    const endpoint = `${protocol}://${hostname}`;

    this.client = new Colyseus.Client(endpoint);
    this.room   = await this.client.joinOrCreate<DungeonState>("dungeon", options);
    this.isGM   = options.isGM === true;

    console.log(`[NetworkManager] Connecté à ${endpoint} — sessionId: ${this.room.sessionId}`);
  }

  // Déplace un token vers les coordonnées de tuile indiquées
  // Équivalent d'un NetworkTransform Unity
  moveToken(tokenId: string, tileX: number, tileY: number): void {
    this.room.send("MOVE_TOKEN", { tokenId, tileX, tileY });
  }

  // Met à jour les HP d'un token (GM seulement côté serveur)
  updateHp(tokenId: string, hp: number): void {
    this.room.send("UPDATE_HP", { tokenId, hp });
  }

  // Active/désactive le brouillard de guerre ou le Line-of-Sight (GM seulement)
  toggleFog(fogEnabled?: boolean, losEnabled?: boolean): void {
    this.room.send("TOGGLE_FOG", { fogEnabled, losEnabled });
  }

  // Contrôle le mode combat (GM seulement)
  combat(action: "start" | "end" | "nextTurn"): void {
    this.room.send("COMBAT", { action });
  }

  // Modifie l'échelle des cases en mètres (GM seulement)
  setTileScale(scale: number): void {
    this.room.send("SET_TILE_SCALE", { scale });
  }
}

// Export du singleton pour utilisation dans toutes les scènes
export const network = NetworkManager.getInstance();
