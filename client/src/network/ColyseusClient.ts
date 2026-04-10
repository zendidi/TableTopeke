import * as Colyseus from "colyseus.js";
import { DungeonState, Player } from "../../../server/src/schema/DungeonState";
import type { MapSchema } from "@colyseus/schema";
import { DebugOverlay } from "../ui/DebugOverlay";

const DEBUG_NETWORK = import.meta.env.DEV;

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
    // isGM est déterminé depuis l'état serveur : si le serveur a enregistré notre sessionId
    // comme gmSessionId, l'auth a réussi. Cela évite l'état incohérent où le client se croit
    // GM alors que le serveur a rejeté le mot de passe.
    this.isGM   = this.room.state.gmSessionId === this.room.sessionId;

    console.log(`[NetworkManager] Connecté à ${endpoint} — sessionId: ${this.room.sessionId}`);

    this.room.onError((code, message) => {
      console.error("[ROOM ERROR]", code, message);
      DebugOverlay.setLastError(`[ROOM ERROR] ${String(message ?? code)}`);
    });
    this.room.onLeave((code) =>
      console.warn("[ROOM LEAVE] code:", code));
  }

  // Référence vers la MapSchema des joueurs connectés (synchronisée par Colyseus)
  get players(): MapSchema<Player> {
    return this.room.state.players;
  }

  // Déplace un token vers les coordonnées de tuile indiquées
  // Équivalent d'un NetworkTransform Unity
  moveToken(tokenId: string, tileX: number, tileY: number): void {
    if (DEBUG_NETWORK) console.log("[NET →] MOVE_TOKEN", { tokenId, tileX, tileY });
    this.room.send("MOVE_TOKEN", { tokenId, tileX, tileY });
  }

  // Met à jour les HP d'un token (GM seulement côté serveur)
  updateHp(tokenId: string, hp: number): void {
    if (DEBUG_NETWORK) console.log("[NET →] UPDATE_HP", { tokenId, hp });
    this.room.send("UPDATE_HP", { tokenId, hp });
  }

  // Active/désactive le brouillard de guerre ou le Line-of-Sight (GM seulement)
  toggleFog(fogEnabled?: boolean, losEnabled?: boolean): void {
    if (DEBUG_NETWORK) console.log("[NET →] TOGGLE_FOG", { fogEnabled, losEnabled });
    this.room.send("TOGGLE_FOG", { fogEnabled, losEnabled });
  }

  // Contrôle le mode combat (GM seulement)
  combat(action: "start" | "end" | "next"): void {
    if (DEBUG_NETWORK) console.log("[NET →] COMBAT_ACTION", { action });
    this.room.send("COMBAT_ACTION", { action });
  }

  // Modifie l'échelle des cases en mètres (GM seulement)
  setTileScale(scale: number): void {
    if (DEBUG_NETWORK) console.log("[NET →] SET_TILE_SCALE", { scale });
    this.room.send("SET_TILE_SCALE", { scale });
  }

  // Demande au serveur de changer la map active (GM seulement)
  loadMap(mapName: string): void {
    if (DEBUG_NETWORK) console.log("[NET →] LOAD_MAP", { mapName });
    this.room.send("LOAD_MAP", { mapName });
  }
}

// Export du singleton pour utilisation dans toutes les scènes
export const network = NetworkManager.getInstance();
