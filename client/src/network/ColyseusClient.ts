import * as Colyseus from "colyseus.js";
import { DungeonState, Player } from "../../../server/src/schema/DungeonState";
import type { MapSchema } from "@colyseus/schema";

// Type pour les options de connexion (issues de player-config.json ou window.__playerConfig)
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
  // Les options peuvent venir de player-config.json (via Phaser cache) ou de window.__playerConfig
  async connect(options: ConnectOptions): Promise<void> {
    // Fusionner avec window.__playerConfig si disponible (priorité aux options passées)
    const configOverride = window.__playerConfig ?? {};
    const mergedOptions: ConnectOptions = { ...configOverride, ...options };

    // En développement on pointe vers localhost, en production vers le même host que le client
    const isDev    = window.location.hostname === "localhost";
    const hostname = isDev ? "localhost:2567" : window.location.hostname;
    const protocol = isDev ? "ws" : "wss";
    const endpoint = `${protocol}://${hostname}`;

    this.client = new Colyseus.Client(endpoint);
    this.room   = await this.client.joinOrCreate<DungeonState>("dungeon", mergedOptions);
    this.isGM   = mergedOptions.isGM === true;

    console.log(`[NetworkManager] Connecté à ${endpoint} — sessionId: ${this.room.sessionId}`);
  }

  // Référence vers la MapSchema des joueurs connectés (synchronisée par Colyseus)
  get players(): MapSchema<Player> {
    return this.room.state.players;
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
  combat(action: "start" | "end" | "next"): void {
    this.room.send("COMBAT_ACTION", { action });
  }

  // Modifie l'échelle des cases en mètres (GM seulement)
  setTileScale(scale: number): void {
    this.room.send("SET_TILE_SCALE", { scale });
  }

  // Demande au serveur de changer la map active (GM seulement)
  loadMap(mapName: string): void {
    this.room.send("LOAD_MAP", { mapName });
  }
}

// Export du singleton pour utilisation dans toutes les scènes
export const network = NetworkManager.getInstance();
