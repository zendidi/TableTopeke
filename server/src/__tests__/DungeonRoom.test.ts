// Tests unitaires de la DungeonRoom — vérifient onAuth et les handlers de messages
// Framework : Vitest (environnement Node) avec mock client minimal
// Les handlers sont capturés via vi.spyOn afin de ne pas nécessiter de serveur Colyseus

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DungeonRoom } from "../rooms/DungeonRoom";
import { DungeonState, Token } from "../schema/DungeonState";

const GM_PASSWORD = process.env.GM_PASSWORD ?? "master1234";

// Client factice minimal
interface MockClient {
  sessionId: string;
}

// Signature des handlers enregistrés via onMessage
type MsgHandler = (client: MockClient, data: unknown) => void;

// Instancie une DungeonRoom avec les internals mockés pour les tests unitaires
function createRoom(): { room: DungeonRoom; handlers: Map<string, MsgHandler> } {
  const room = new DungeonRoom();
  const handlers = new Map<string, MsgHandler>();

  // Capture les handlers sans passer par l'infrastructure Colyseus
  vi.spyOn(room as any, "onMessage").mockImplementation(
    (type: string, handler: MsgHandler) => {
      handlers.set(type, handler);
    },
  );

  // setState minimal : assigne simplement this.state
  vi.spyOn(room as any, "setState").mockImplementation((state: DungeonState) => {
    (room as any).state = state;
  });

  room.onCreate({});

  return { room, handlers };
}

// ── onAuth ────────────────────────────────────────────────────────────────────

describe("DungeonRoom.onAuth", () => {
  it("retourne { isGM: true } avec le bon mot de passe", () => {
    const room = new DungeonRoom();
    const result = room.onAuth({} as any, { gmPassword: GM_PASSWORD });
    expect(result).toEqual({ isGM: true });
  });

  it("retourne { isGM: false } avec un mauvais mot de passe", () => {
    const room = new DungeonRoom();
    const result = room.onAuth({} as any, { gmPassword: "mauvais_password" });
    expect(result).toEqual({ isGM: false });
  });
});

// ── MOVE_TOKEN ────────────────────────────────────────────────────────────────

describe("DungeonRoom MOVE_TOKEN", () => {
  let room: DungeonRoom;
  let handlers: Map<string, MsgHandler>;

  beforeEach(() => {
    ({ room, handlers } = createRoom());
  });

  it("le propriétaire peut déplacer son token", () => {
    const token = new Token();
    token.ownerId = "player1";
    token.tileX = 0;
    token.tileY = 0;
    (room as any).state.tokens.set("player1", token);

    handlers.get("MOVE_TOKEN")!({ sessionId: "player1" }, { tokenId: "player1", tileX: 5, tileY: 7 });

    expect(token.tileX).toBe(5);
    expect(token.tileY).toBe(7);
  });

  it("un autre joueur ne peut pas déplacer le token d'un tiers", () => {
    const token = new Token();
    token.ownerId = "player1";
    token.tileX = 3;
    token.tileY = 4;
    (room as any).state.tokens.set("player1", token);

    handlers.get("MOVE_TOKEN")!({ sessionId: "player2" }, { tokenId: "player1", tileX: 99, tileY: 99 });

    expect(token.tileX).toBe(3);
    expect(token.tileY).toBe(4);
  });

  it("le GM peut déplacer n'importe quel token", () => {
    (room as any).state.gmSessionId = "gm1";

    const token = new Token();
    token.ownerId = "player1";
    token.tileX = 0;
    token.tileY = 0;
    (room as any).state.tokens.set("player1", token);

    handlers.get("MOVE_TOKEN")!({ sessionId: "gm1" }, { tokenId: "player1", tileX: 10, tileY: 15 });

    expect(token.tileX).toBe(10);
    expect(token.tileY).toBe(15);
  });
});

// ── LOAD_MAP ──────────────────────────────────────────────────────────────────

describe("DungeonRoom LOAD_MAP", () => {
  let room: DungeonRoom;
  let handlers: Map<string, MsgHandler>;

  beforeEach(() => {
    ({ room, handlers } = createRoom());
  });

  it("le GM peut changer la map", () => {
    (room as any).state.gmSessionId = "gm1";

    handlers.get("LOAD_MAP")!({ sessionId: "gm1" }, { mapName: "donjon-secret" });

    expect((room as any).state.currentMap).toBe("donjon-secret");
  });

  it("un joueur non-GM ne peut pas changer la map", () => {
    (room as any).state.currentMap = "map-initiale";

    handlers.get("LOAD_MAP")!({ sessionId: "player1" }, { mapName: "map-interdite" });

    expect((room as any).state.currentMap).toBe("map-initiale");
  });
});

// ── UPDATE_HP ─────────────────────────────────────────────────────────────────

describe("DungeonRoom UPDATE_HP", () => {
  let room: DungeonRoom;
  let handlers: Map<string, MsgHandler>;

  beforeEach(() => {
    ({ room, handlers } = createRoom());
  });

  it("le GM peut modifier les HP d'un token", () => {
    (room as any).state.gmSessionId = "gm1";

    const token = new Token();
    token.hp = 20;
    token.hpMax = 20;
    (room as any).state.tokens.set("token1", token);

    handlers.get("UPDATE_HP")!({ sessionId: "gm1" }, { tokenId: "token1", hp: 10 });

    expect(token.hp).toBe(10);
  });

  it("un joueur non-GM ne peut pas modifier les HP", () => {
    const token = new Token();
    token.hp = 20;
    token.hpMax = 20;
    (room as any).state.tokens.set("token1", token);

    handlers.get("UPDATE_HP")!({ sessionId: "player1" }, { tokenId: "token1", hp: 1 });

    expect(token.hp).toBe(20);
  });
});

// ── onJoin — joueur normal ────────────────────────────────────────────────────

describe("DungeonRoom.onJoin — joueur normal", () => {
  it("crée un Player avec les bonnes propriétés", () => {
    const { room } = createRoom();
    const client = { sessionId: "player1" } as any;
    room.onJoin(client, { name: "Alice", color: "#ff0000" }, { isGM: false });

    const player = (room as any).state.players.get("player1");
    expect(player).toBeDefined();
    expect(player.name).toBe("Alice");
    expect(player.color).toBe("#ff0000");
    expect(player.isGM).toBe(false);
    expect(player.isConnected).toBe(true);
    expect(player.sessionId).toBe("player1");
  });

  it("crée un Token avec les bonnes propriétés", () => {
    const { room } = createRoom();
    const client = { sessionId: "player1" } as any;
    room.onJoin(client, { name: "Alice", color: "#ff0000", hp: 30, hpMax: 30 }, { isGM: false });

    const token = (room as any).state.tokens.get("player1");
    expect(token).toBeDefined();
    expect(token.name).toBe("Alice");
    expect(token.color).toBe("#ff0000");
    expect(token.hp).toBe(30);
    expect(token.hpMax).toBe(30);
    expect(token.ownerId).toBe("player1");
    expect(token.isGM).toBe(false);
    expect(token.isVisible).toBe(true);
  });

  it("n'enregistre pas gmSessionId pour un joueur normal", () => {
    const { room } = createRoom();
    const client = { sessionId: "player1" } as any;
    room.onJoin(client, { name: "Alice" }, { isGM: false });

    expect((room as any).state.gmSessionId).toBe("");
  });
});

// ── onJoin — GM ───────────────────────────────────────────────────────────────

describe("DungeonRoom.onJoin — GM", () => {
  it("enregistre gmSessionId quand le premier GM rejoint", () => {
    const { room } = createRoom();
    const client = { sessionId: "gm1" } as any;
    room.onJoin(client, { name: "Maître", gmPassword: "master1234" }, { isGM: true });

    expect((room as any).state.gmSessionId).toBe("gm1");
  });

  it("crée un Token avec isGM: true pour le GM", () => {
    const { room } = createRoom();
    const client = { sessionId: "gm1" } as any;
    room.onJoin(client, { name: "Maître" }, { isGM: true });

    const token = (room as any).state.tokens.get("gm1");
    expect(token.isGM).toBe(true);
  });

  it("n'écrase pas gmSessionId si un GM est déjà enregistré", () => {
    const { room } = createRoom();
    (room as any).state.gmSessionId = "gm1";

    const client2 = { sessionId: "gm2" } as any;
    room.onJoin(client2, { name: "Imposteur" }, { isGM: true });

    // gmSessionId doit rester "gm1", pas "gm2"
    expect((room as any).state.gmSessionId).toBe("gm1");
  });
});

// ── TOGGLE_FOG ────────────────────────────────────────────────────────────────

describe("DungeonRoom TOGGLE_FOG", () => {
  let room: DungeonRoom;
  let handlers: Map<string, MsgHandler>;

  beforeEach(() => {
    ({ room, handlers } = createRoom());
  });

  it("le GM peut activer le fog", () => {
    (room as any).state.gmSessionId = "gm1";
    (room as any).state.fogEnabled = false;

    handlers.get("TOGGLE_FOG")!({ sessionId: "gm1" }, { fogEnabled: true });

    expect((room as any).state.fogEnabled).toBe(true);
  });

  it("le GM peut désactiver le fog", () => {
    (room as any).state.gmSessionId = "gm1";
    (room as any).state.fogEnabled = true;

    handlers.get("TOGGLE_FOG")!({ sessionId: "gm1" }, { fogEnabled: false });

    expect((room as any).state.fogEnabled).toBe(false);
  });

  it("le GM peut activer le LOS indépendamment du fog", () => {
    (room as any).state.gmSessionId = "gm1";
    (room as any).state.losEnabled = false;

    handlers.get("TOGGLE_FOG")!({ sessionId: "gm1" }, { losEnabled: true });

    expect((room as any).state.losEnabled).toBe(true);
  });

  it("un joueur non-GM ne peut pas modifier le fog", () => {
    (room as any).state.fogEnabled = false;

    handlers.get("TOGGLE_FOG")!({ sessionId: "player1" }, { fogEnabled: true });

    expect((room as any).state.fogEnabled).toBe(false);
  });
});

// ── SET_TILE_SCALE ────────────────────────────────────────────────────────────

describe("DungeonRoom SET_TILE_SCALE", () => {
  let room: DungeonRoom;
  let handlers: Map<string, MsgHandler>;

  beforeEach(() => {
    ({ room, handlers } = createRoom());
  });

  it("le GM peut modifier l'échelle", () => {
    (room as any).state.gmSessionId = "gm1";

    handlers.get("SET_TILE_SCALE")!({ sessionId: "gm1" }, { scale: 2.0 });

    expect((room as any).state.tileScale).toBe(2.0);
  });

  it("une valeur <= 0 est ignorée", () => {
    (room as any).state.gmSessionId = "gm1";
    (room as any).state.tileScale = 1.5;

    handlers.get("SET_TILE_SCALE")!({ sessionId: "gm1" }, { scale: 0 });

    expect((room as any).state.tileScale).toBe(1.5);
  });

  it("une valeur négative est ignorée", () => {
    (room as any).state.gmSessionId = "gm1";
    (room as any).state.tileScale = 1.5;

    handlers.get("SET_TILE_SCALE")!({ sessionId: "gm1" }, { scale: -1 });

    expect((room as any).state.tileScale).toBe(1.5);
  });

  it("un joueur non-GM ne peut pas modifier l'échelle", () => {
    (room as any).state.tileScale = 1.5;

    handlers.get("SET_TILE_SCALE")!({ sessionId: "player1" }, { scale: 3.0 });

    expect((room as any).state.tileScale).toBe(1.5);
  });
});

// ── SET_INITIATIVE ────────────────────────────────────────────────────────────

describe("DungeonRoom SET_INITIATIVE", () => {
  let room: DungeonRoom;
  let handlers: Map<string, MsgHandler>;

  beforeEach(() => {
    ({ room, handlers } = createRoom());
  });

  it("le GM peut définir l'ordre d'initiative", () => {
    (room as any).state.gmSessionId = "gm1";

    handlers.get("SET_INITIATIVE")!({ sessionId: "gm1" }, { order: ["player3", "player1", "player2"] });

    const order = (room as any).state.initiativeOrder;
    expect(order[0]).toBe("player3");
    expect(order[1]).toBe("player1");
    expect(order[2]).toBe("player2");
    expect(order.length).toBe(3);
  });

  it("SET_INITIATIVE écrase l'ordre précédent", () => {
    (room as any).state.gmSessionId = "gm1";

    handlers.get("SET_INITIATIVE")!({ sessionId: "gm1" }, { order: ["player1", "player2"] });
    handlers.get("SET_INITIATIVE")!({ sessionId: "gm1" }, { order: ["player3"] });

    const order = (room as any).state.initiativeOrder;
    expect(order.length).toBe(1);
    expect(order[0]).toBe("player3");
  });

  it("un joueur non-GM ne peut pas définir l'initiative", () => {
    handlers.get("SET_INITIATIVE")!({ sessionId: "player1" }, { order: ["player1"] });

    const order = (room as any).state.initiativeOrder;
    expect(order.length).toBe(0);
  });

  it("une donnée non-tableau est ignorée", () => {
    (room as any).state.gmSessionId = "gm1";

    handlers.get("SET_INITIATIVE")!({ sessionId: "gm1" }, { order: "invalid" as any });

    expect((room as any).state.initiativeOrder.length).toBe(0);
  });
});

// ── COMBAT_ACTION ─────────────────────────────────────────────────────────────

describe("DungeonRoom COMBAT_ACTION", () => {
  let room: DungeonRoom;
  let handlers: Map<string, MsgHandler>;

  beforeEach(() => {
    ({ room, handlers } = createRoom());
    (room as any).state.gmSessionId = "gm1";
  });

  it("start : active le combat et passe au premier combattant", () => {
    (room as any).state.initiativeOrder.push("player2");
    (room as any).state.initiativeOrder.push("player1");

    handlers.get("COMBAT_ACTION")!({ sessionId: "gm1" }, { action: "start" });

    expect((room as any).state.combatActive).toBe(true);
    expect((room as any).state.currentTurn).toBe(1);
    expect((room as any).state.currentTurnId).toBe("player2");
  });

  it("start sans initiative : currentTurnId reste vide", () => {
    handlers.get("COMBAT_ACTION")!({ sessionId: "gm1" }, { action: "start" });

    expect((room as any).state.combatActive).toBe(true);
    expect((room as any).state.currentTurnId).toBe("");
  });

  it("next : avance au combattant suivant", () => {
    (room as any).state.initiativeOrder.push("player1");
    (room as any).state.initiativeOrder.push("player2");
    (room as any).state.initiativeOrder.push("player3");
    (room as any).state.combatActive = true;
    (room as any).state.currentTurn = 1;
    (room as any).state.currentTurnId = "player1";

    handlers.get("COMBAT_ACTION")!({ sessionId: "gm1" }, { action: "next" });

    expect((room as any).state.currentTurn).toBe(2);
    expect((room as any).state.currentTurnId).toBe("player2");
  });

  it("next : rotation cyclique (dernier → premier)", () => {
    (room as any).state.initiativeOrder.push("player1");
    (room as any).state.initiativeOrder.push("player2");
    (room as any).state.combatActive = true;
    (room as any).state.currentTurn = 2;
    (room as any).state.currentTurnId = "player2";

    handlers.get("COMBAT_ACTION")!({ sessionId: "gm1" }, { action: "next" });

    expect((room as any).state.currentTurnId).toBe("player1");
    expect((room as any).state.currentTurn).toBe(3);
  });

  it("next ignoré si combat inactif", () => {
    (room as any).state.combatActive = false;
    (room as any).state.currentTurn = 0;

    handlers.get("COMBAT_ACTION")!({ sessionId: "gm1" }, { action: "next" });

    expect((room as any).state.currentTurn).toBe(0);
  });

  it("end : réinitialise tout l'état de combat", () => {
    (room as any).state.combatActive = true;
    (room as any).state.currentTurn = 5;
    (room as any).state.currentTurnId = "player1";
    (room as any).state.initiativeOrder.push("player1");
    (room as any).state.initiativeOrder.push("player2");

    handlers.get("COMBAT_ACTION")!({ sessionId: "gm1" }, { action: "end" });

    expect((room as any).state.combatActive).toBe(false);
    expect((room as any).state.currentTurn).toBe(0);
    expect((room as any).state.currentTurnId).toBe("");
    expect((room as any).state.initiativeOrder.length).toBe(0);
  });

  it("un joueur non-GM ne peut pas démarrer le combat", () => {
    handlers.get("COMBAT_ACTION")!({ sessionId: "player1" }, { action: "start" });

    expect((room as any).state.combatActive).toBe(false);
  });
});

// ── LOAD_MAP — cas supplémentaires ────────────────────────────────────────────

describe("DungeonRoom LOAD_MAP — cas supplémentaires", () => {
  let room: DungeonRoom;
  let handlers: Map<string, MsgHandler>;

  beforeEach(() => {
    ({ room, handlers } = createRoom());
  });

  it("repositionne tous les tokens au spawn par défaut", () => {
    (room as any).state.gmSessionId = "gm1";

    const token1 = new Token();
    token1.tileX = 99; token1.tileY = 99;
    const token2 = new Token();
    token2.tileX = 50; token2.tileY = 50;

    (room as any).state.tokens.set("p1", token1);
    (room as any).state.tokens.set("p2", token2);

    handlers.get("LOAD_MAP")!({ sessionId: "gm1" }, { mapName: "nouvelle-map" });

    expect(token1.tileX).toBe(20);
    expect(token1.tileY).toBe(20);
    expect(token2.tileX).toBe(20);
    expect(token2.tileY).toBe(20);
  });

  it("un mapName vide est ignoré", () => {
    (room as any).state.gmSessionId = "gm1";
    (room as any).state.currentMap = "map-actuelle";

    handlers.get("LOAD_MAP")!({ sessionId: "gm1" }, { mapName: "" });

    expect((room as any).state.currentMap).toBe("map-actuelle");
  });
});

// ── UPDATE_HP — cas limites ───────────────────────────────────────────────────

describe("DungeonRoom UPDATE_HP — cas limites", () => {
  let room: DungeonRoom;
  let handlers: Map<string, MsgHandler>;

  beforeEach(() => {
    ({ room, handlers } = createRoom());
  });

  it("les HP ne descendent pas sous 0", () => {
    (room as any).state.gmSessionId = "gm1";

    const token = new Token();
    token.hp = 5;
    token.hpMax = 20;
    (room as any).state.tokens.set("token1", token);

    handlers.get("UPDATE_HP")!({ sessionId: "gm1" }, { tokenId: "token1", hp: -10 });

    expect(token.hp).toBe(0);
  });

  it("les HP ne dépassent pas hpMax", () => {
    (room as any).state.gmSessionId = "gm1";

    const token = new Token();
    token.hp = 10;
    token.hpMax = 20;
    (room as any).state.tokens.set("token1", token);

    handlers.get("UPDATE_HP")!({ sessionId: "gm1" }, { tokenId: "token1", hp: 999 });

    expect(token.hp).toBe(20);
  });

  it("token inexistant ignoré sans crash", () => {
    (room as any).state.gmSessionId = "gm1";

    expect(() => {
      handlers.get("UPDATE_HP")!({ sessionId: "gm1" }, { tokenId: "inexistant", hp: 5 });
    }).not.toThrow();
  });
});
