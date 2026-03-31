// Tests unitaires de la DungeonRoom — vérifient onAuth et les handlers de messages
// Framework : Vitest (environnement Node) avec mock client minimal
// Les handlers sont capturés via vi.spyOn afin de ne pas nécessiter de serveur Colyseus

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DungeonRoom } from "../rooms/DungeonRoom";
import { DungeonState, Token } from "../schema/DungeonState";

const GM_PASSWORD = process.env.GM_PASSWORD ?? "admin";

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
