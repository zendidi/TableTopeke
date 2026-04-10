import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";

// Représente un pion sur la grille (équivalent d'un NetworkObject Unity)
export class Token extends Schema {
  @type("string")  id: string = "";
  @type("string")  ownerId: string = "";
  @type("number")  tileX: number = 0;
  @type("number")  tileY: number = 0;
  @type("string")  name: string = "Unknown";
  @type("string")  avatarUrl: string = "";
  @type("string")  color: string = "#ffffff";
  @type("number")  hp: number = 20;
  @type("number")  hpMax: number = 20;
  @type("boolean") isGM: boolean = false;
  // Visibilité du token (masqué par le Fog of War si false)
  @type("boolean") isVisible: boolean = true;
}

// Représente un joueur connecté à la session
export class Player extends Schema {
  @type("string")  sessionId: string = "";
  @type("string")  name: string = "Joueur";
  @type("string")  color: string = "#ffffff";
  @type("boolean") isGM: boolean = false;
  @type("boolean") isConnected: boolean = true;
}

// État global de la salle (équivalent d'un NetworkManager Unity)
export class DungeonState extends Schema {
  @type({ map: Player })  players = new MapSchema<Player>();
  @type({ map: Token })   tokens  = new MapSchema<Token>();

  // Paramètres de visibilité
  @type("boolean") fogEnabled: boolean = true;
  @type("boolean") losEnabled: boolean = false;

  // Gestion du combat au tour par tour
  @type("string")  currentTurnId: string = "";
  @type("number")  currentTurn: number = 0;
  @type("boolean") combatActive: boolean = false;

  // Identifiant de session du GM
  @type("string")  gmSessionId: string = "";

  // Taille d'une case en mètres (configurable par le GM, défaut = 1,5m comme D&D 5e)
  @type("float32") tileScale: number = 1.5;

  // Nom de la map active (sans extension .json) — synchronisé en temps réel
  @type("string")  currentMap: string = "grande-salle";

  // Ordre d'initiative : tableau des tokenId dans l'ordre de passage (Phase 3)
  @type(["string"]) initiativeOrder = new ArraySchema<string>();
}
