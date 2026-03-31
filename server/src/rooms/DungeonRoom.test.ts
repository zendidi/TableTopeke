// Tests de la DungeonRoom — vérifient les messages Colyseus et les droits d'accès
// Framework : Jest + @colyseus/testing (v0.15)

import { ColyseusTestServer, boot } from "@colyseus/testing";
import { Server } from "@colyseus/core";
import { DungeonRoom } from "../rooms/DungeonRoom";

// Mot de passe GM utilisé dans tous les tests
const GM_PASSWORD = process.env.GM_PASSWORD ?? "admin";

describe("DungeonRoom", () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    const server = new Server();
    server.define("dungeon", DungeonRoom);
    colyseus = await boot(server, 0);
  });

  afterAll(async () => {
    await colyseus.shutdown();
  });

  afterEach(async () => {
    await colyseus.cleanup();
  });

  // ── Connexion et rôles ──────────────────────────────────────────────────

  it("un joueur rejoint en tant que joueur normal par défaut", async () => {
    const room   = await colyseus.createRoom("dungeon", {});
    const client = await colyseus.connectTo(room, { name: "Alice" });

    await room.waitForNextPatch();

    expect(room.state.players.has(client.sessionId)).toBe(true);
    const player = room.state.players.get(client.sessionId)!;
    expect(player.name).toBe("Alice");
    expect(player.isGM).toBe(false);
  });

  it("un joueur avec le bon mot de passe devient GM", async () => {
    const room   = await colyseus.createRoom("dungeon", {});
    const client = await colyseus.connectTo(room, {
      name: "Le GM",
      isGM: true,
      gmPassword: GM_PASSWORD,
    });

    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId)!;
    expect(player.isGM).toBe(true);
    expect(room.state.gmSessionId).toBe(client.sessionId);
  });

  it("un joueur avec un mauvais mot de passe n'est pas GM", async () => {
    const room   = await colyseus.createRoom("dungeon", {});
    const client = await colyseus.connectTo(room, {
      name: "Imposteur",
      isGM: true,
      gmPassword: "mauvais_password",
    });

    await room.waitForNextPatch();

    const player = room.state.players.get(client.sessionId)!;
    expect(player.isGM).toBe(false);
    expect(room.state.gmSessionId).toBe("");
  });

  // ── Token créé à la connexion ───────────────────────────────────────────

  it("un token est créé pour chaque joueur qui rejoint", async () => {
    const room   = await colyseus.createRoom("dungeon", {});
    const client = await colyseus.connectTo(room, { name: "Bob", color: "#ff0000", hp: 30, hpMax: 40 });

    await room.waitForNextPatch();

    const token = room.state.tokens.get(client.sessionId)!;
    expect(token).toBeDefined();
    expect(token.name).toBe("Bob");
    expect(token.color).toBe("#ff0000");
    expect(token.hp).toBe(30);
    expect(token.hpMax).toBe(40);
  });

  // ── MOVE_TOKEN ──────────────────────────────────────────────────────────

  it("MOVE_TOKEN : un joueur peut déplacer son propre token", async () => {
    const room   = await colyseus.createRoom("dungeon", {});
    const client = await colyseus.connectTo(room, { name: "Carol" });

    await room.waitForNextPatch();

    client.send("MOVE_TOKEN", { tokenId: client.sessionId, tileX: 5, tileY: 7 });
    await room.waitForNextPatch();

    const token = room.state.tokens.get(client.sessionId)!;
    expect(token.tileX).toBe(5);
    expect(token.tileY).toBe(7);
  });

  it("MOVE_TOKEN : le GM peut déplacer n'importe quel token", async () => {
    const room     = await colyseus.createRoom("dungeon", {});
    const player   = await colyseus.connectTo(room, { name: "David" });
    const gm       = await colyseus.connectTo(room, { name: "GM", isGM: true, gmPassword: GM_PASSWORD });

    await room.waitForNextPatch();

    gm.send("MOVE_TOKEN", { tokenId: player.sessionId, tileX: 10, tileY: 15 });
    await room.waitForNextPatch();

    const token = room.state.tokens.get(player.sessionId)!;
    expect(token.tileX).toBe(10);
    expect(token.tileY).toBe(15);
  });

  it("MOVE_TOKEN : un joueur ne peut pas déplacer le token d'un autre joueur", async () => {
    const room     = await colyseus.createRoom("dungeon", {});
    const player1  = await colyseus.connectTo(room, { name: "Eve" });
    const player2  = await colyseus.connectTo(room, { name: "Frank" });

    await room.waitForNextPatch();

    const token1Before = { x: room.state.tokens.get(player1.sessionId)!.tileX, y: room.state.tokens.get(player1.sessionId)!.tileY };

    // player2 tente de déplacer le token de player1
    player2.send("MOVE_TOKEN", { tokenId: player1.sessionId, tileX: 99, tileY: 99 });
    await room.waitForNextPatch();

    const token = room.state.tokens.get(player1.sessionId)!;
    expect(token.tileX).toBe(token1Before.x);
    expect(token.tileY).toBe(token1Before.y);
  });

  // ── UPDATE_HP ───────────────────────────────────────────────────────────

  it("UPDATE_HP : le GM peut modifier les HP d'un token", async () => {
    const room   = await colyseus.createRoom("dungeon", {});
    const player = await colyseus.connectTo(room, { name: "Grace", hp: 20, hpMax: 20 });
    const gm     = await colyseus.connectTo(room, { name: "GM", isGM: true, gmPassword: GM_PASSWORD });

    await room.waitForNextPatch();

    gm.send("UPDATE_HP", { tokenId: player.sessionId, hp: 10 });
    await room.waitForNextPatch();

    expect(room.state.tokens.get(player.sessionId)!.hp).toBe(10);
  });

  it("UPDATE_HP : un joueur ne peut pas modifier les HP", async () => {
    const room   = await colyseus.createRoom("dungeon", {});
    const player = await colyseus.connectTo(room, { name: "Heidi", hp: 20, hpMax: 20 });

    await room.waitForNextPatch();

    player.send("UPDATE_HP", { tokenId: player.sessionId, hp: 1 });
    await room.waitForNextPatch();

    // HP doit rester à 20
    expect(room.state.tokens.get(player.sessionId)!.hp).toBe(20);
  });

  it("UPDATE_HP : les HP ne peuvent pas dépasser hpMax ni descendre sous 0", async () => {
    const room   = await colyseus.createRoom("dungeon", {});
    const player = await colyseus.connectTo(room, { name: "Ivan", hp: 10, hpMax: 20 });
    const gm     = await colyseus.connectTo(room, { name: "GM", isGM: true, gmPassword: GM_PASSWORD });

    await room.waitForNextPatch();

    gm.send("UPDATE_HP", { tokenId: player.sessionId, hp: 999 });
    await room.waitForNextPatch();
    expect(room.state.tokens.get(player.sessionId)!.hp).toBe(20); // clampé à hpMax

    gm.send("UPDATE_HP", { tokenId: player.sessionId, hp: -5 });
    await room.waitForNextPatch();
    expect(room.state.tokens.get(player.sessionId)!.hp).toBe(0);  // clampé à 0
  });

  // ── LOAD_MAP ────────────────────────────────────────────────────────────

  it("LOAD_MAP : le GM peut changer la map", async () => {
    const room = await colyseus.createRoom("dungeon", {});
    const gm   = await colyseus.connectTo(room, { name: "GM", isGM: true, gmPassword: GM_PASSWORD });

    await room.waitForNextPatch();

    gm.send("LOAD_MAP", { mapName: "donjon-secret" });
    await room.waitForNextPatch();

    expect(room.state.currentMap).toBe("donjon-secret");
  });

  it("LOAD_MAP : les tokens sont repositionnés au centre lors d'un changement de map", async () => {
    const room   = await colyseus.createRoom("dungeon", {});
    const player = await colyseus.connectTo(room, { name: "Judy" });
    const gm     = await colyseus.connectTo(room, { name: "GM", isGM: true, gmPassword: GM_PASSWORD });

    await room.waitForNextPatch();

    // Déplacer le token du joueur
    gm.send("MOVE_TOKEN", { tokenId: player.sessionId, tileX: 35, tileY: 38 });
    await room.waitForNextPatch();

    // Changer de map
    gm.send("LOAD_MAP", { mapName: "nouvelle-map" });
    await room.waitForNextPatch();

    const token = room.state.tokens.get(player.sessionId)!;
    expect(token.tileX).toBe(20); // DEFAULT_TOKEN_SPAWN.x
    expect(token.tileY).toBe(20); // DEFAULT_TOKEN_SPAWN.y
  });

  it("LOAD_MAP : un joueur non-GM ne peut pas changer la map", async () => {
    const room   = await colyseus.createRoom("dungeon", {});
    const player = await colyseus.connectTo(room, { name: "Karl" });

    await room.waitForNextPatch();

    const mapBefore = room.state.currentMap;
    player.send("LOAD_MAP", { mapName: "map-interdite" });
    await room.waitForNextPatch();

    expect(room.state.currentMap).toBe(mapBefore);
  });

  // ── COMBAT_ACTION ───────────────────────────────────────────────────────

  it("COMBAT_ACTION start : le GM peut démarrer le combat", async () => {
    const room = await colyseus.createRoom("dungeon", {});
    const gm   = await colyseus.connectTo(room, { name: "GM", isGM: true, gmPassword: GM_PASSWORD });

    await room.waitForNextPatch();

    expect(room.state.combatActive).toBe(false);
    gm.send("COMBAT_ACTION", { action: "start" });
    await room.waitForNextPatch();

    expect(room.state.combatActive).toBe(true);
    expect(room.state.currentTurn).toBe(1);
  });

  it("COMBAT_ACTION next : avance le tour", async () => {
    const room = await colyseus.createRoom("dungeon", {});
    const gm   = await colyseus.connectTo(room, { name: "GM", isGM: true, gmPassword: GM_PASSWORD });

    await room.waitForNextPatch();

    gm.send("COMBAT_ACTION", { action: "start" });
    await room.waitForNextPatch();

    gm.send("COMBAT_ACTION", { action: "next" });
    await room.waitForNextPatch();

    expect(room.state.currentTurn).toBe(2);
  });

  it("COMBAT_ACTION end : termine le combat", async () => {
    const room = await colyseus.createRoom("dungeon", {});
    const gm   = await colyseus.connectTo(room, { name: "GM", isGM: true, gmPassword: GM_PASSWORD });

    await room.waitForNextPatch();

    gm.send("COMBAT_ACTION", { action: "start" });
    await room.waitForNextPatch();

    gm.send("COMBAT_ACTION", { action: "end" });
    await room.waitForNextPatch();

    expect(room.state.combatActive).toBe(false);
    expect(room.state.currentTurn).toBe(0);
    expect(room.state.currentTurnId).toBe("");
  });

  it("COMBAT_ACTION : un joueur non-GM ne peut pas contrôler le combat", async () => {
    const room   = await colyseus.createRoom("dungeon", {});
    const player = await colyseus.connectTo(room, { name: "Lena" });

    await room.waitForNextPatch();

    player.send("COMBAT_ACTION", { action: "start" });
    await room.waitForNextPatch();

    expect(room.state.combatActive).toBe(false);
  });

  // ── SET_TILE_SCALE ──────────────────────────────────────────────────────

  it("SET_TILE_SCALE : le GM peut modifier l'échelle des cases", async () => {
    const room = await colyseus.createRoom("dungeon", {});
    const gm   = await colyseus.connectTo(room, { name: "GM", isGM: true, gmPassword: GM_PASSWORD });

    await room.waitForNextPatch();

    gm.send("SET_TILE_SCALE", { scale: 2.0 });
    await room.waitForNextPatch();

    expect(room.state.tileScale).toBe(2.0);
  });

  it("SET_TILE_SCALE : une valeur <= 0 est ignorée", async () => {
    const room = await colyseus.createRoom("dungeon", {});
    const gm   = await colyseus.connectTo(room, { name: "GM", isGM: true, gmPassword: GM_PASSWORD });

    await room.waitForNextPatch();

    const scaleBefore = room.state.tileScale;
    gm.send("SET_TILE_SCALE", { scale: -1 });
    await room.waitForNextPatch();

    expect(room.state.tileScale).toBe(scaleBefore);
  });

  // ── TOGGLE_FOG ─────────────────────────────────────────────────────────

  it("TOGGLE_FOG : le GM peut activer/désactiver le fog", async () => {
    const room = await colyseus.createRoom("dungeon", {});
    const gm   = await colyseus.connectTo(room, { name: "GM", isGM: true, gmPassword: GM_PASSWORD });

    await room.waitForNextPatch();

    gm.send("TOGGLE_FOG", { fogEnabled: false });
    await room.waitForNextPatch();
    expect(room.state.fogEnabled).toBe(false);

    gm.send("TOGGLE_FOG", { losEnabled: true });
    await room.waitForNextPatch();
    expect(room.state.losEnabled).toBe(true);
  });

  // ── Déconnexion ─────────────────────────────────────────────────────────

  it("déconnexion : le joueur et son token sont supprimés après le délai", async () => {
    const room   = await colyseus.createRoom("dungeon", {});
    const client = await colyseus.connectTo(room, { name: "Mike" });

    await room.waitForNextPatch();
    expect(room.state.players.has(client.sessionId)).toBe(true);

    // Ferme la connexion côté client (déconnexion consentie)
    await client.leave(true);

    // Attendre que le serveur traite la déconnexion
    await new Promise<void>((r) => setTimeout(r, 100));

    expect(room.state.players.has(client.sessionId)).toBe(false);
    expect(room.state.tokens.has(client.sessionId)).toBe(false);
  });
});
