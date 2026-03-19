import { Room, Client } from "colyseus";
import { DungeonState, Player, Token } from "../schema/DungeonState";

// Mot de passe GM lu depuis les variables d'environnement, fallback sur "master1234"
const GM_PASSWORD = process.env.GM_PASSWORD ?? "master1234";

// Options transmises par le client lors du join
interface JoinOptions {
  name?: string;
  color?: string;
  avatarUrl?: string;
  hp?: number;
  hpMax?: number;
  isGM?: boolean;
  gmPassword?: string;
}

// Équivalent d'un NetworkRoomManager Unity
export class DungeonRoom extends Room<DungeonState> {

  // Nombre maximum de joueurs par salle
  maxClients = 20;

  onCreate(_options: Record<string, unknown>): void {
    this.setState(new DungeonState());

    // ── MOVE_TOKEN ──────────────────────────────────────────────────────────
    // Le propriétaire du token ou le GM peut le déplacer
    this.onMessage("MOVE_TOKEN", (client, data: { tokenId: string; tileX: number; tileY: number }) => {
      const token = this.state.tokens.get(data.tokenId);
      if (!token) return;

      const isOwner = token.ownerId === client.sessionId;
      const isGM    = this.state.gmSessionId === client.sessionId;
      if (!isOwner && !isGM) return;

      token.tileX = Math.round(data.tileX);
      token.tileY = Math.round(data.tileY);
    });

    // ── UPDATE_HP ────────────────────────────────────────────────────────────
    // Seul le GM peut modifier les HP (équivalent d'un ServerRpc avec autorité serveur)
    this.onMessage("UPDATE_HP", (client, data: { tokenId: string; hp: number }) => {
      if (this.state.gmSessionId !== client.sessionId) return;

      const token = this.state.tokens.get(data.tokenId);
      if (!token) return;

      token.hp = Math.max(0, Math.min(data.hp, token.hpMax));
    });

    // ── TOGGLE_FOG ───────────────────────────────────────────────────────────
    // GM seulement — active/désactive le brouillard de guerre et le LOS
    this.onMessage("TOGGLE_FOG", (client, data: { fogEnabled?: boolean; losEnabled?: boolean }) => {
      if (this.state.gmSessionId !== client.sessionId) return;

      if (data.fogEnabled !== undefined) this.state.fogEnabled = data.fogEnabled;
      if (data.losEnabled !== undefined) this.state.losEnabled = data.losEnabled;
    });

    // ── COMBAT ───────────────────────────────────────────────────────────────
    // GM seulement — contrôle du mode combat au tour par tour
    this.onMessage("COMBAT", (client, data: { action: "start" | "end" | "nextTurn" }) => {
      if (this.state.gmSessionId !== client.sessionId) return;

      switch (data.action) {
        case "start":
          this.state.combatActive = true;
          this.state.round = 1;
          break;
        case "end":
          this.state.combatActive = false;
          this.state.round = 0;
          this.state.currentTurnId = "";
          break;
        case "nextTurn":
          if (!this.state.combatActive) return;
          this.state.round += 1;
          // La logique d'ordre d'initiative peut être étendue ici
          break;
      }
    });

    // ── SET_TILE_SCALE ───────────────────────────────────────────────────────
    // GM seulement — définit la taille réelle d'une case (en mètres)
    this.onMessage("SET_TILE_SCALE", (client, data: { scale: number }) => {
      if (this.state.gmSessionId !== client.sessionId) return;
      if (typeof data.scale !== "number" || data.scale <= 0) return;

      this.state.tileScale = data.scale;
    });

    console.log(`[DungeonRoom] Salle créée — GM_PASSWORD=${GM_PASSWORD === "master1234" ? "(défaut)" : "(custom)"}`);
  }

  onJoin(client: Client, options: JoinOptions = {}): void {
    console.log(`[DungeonRoom] Joueur connecté: ${client.sessionId} (name="${options.name ?? "?"}")`);

    // ── Vérification du rôle GM ─────────────────────────────────────────────
    const wantsGM = options.isGM === true;
    const isGM    = wantsGM && options.gmPassword === GM_PASSWORD;

    if (wantsGM && !isGM) {
      console.warn(`[DungeonRoom] Tentative GM refusée pour ${client.sessionId} — mauvais mot de passe`);
    }

    // ── Création du joueur ──────────────────────────────────────────────────
    const player = new Player();
    player.sessionId   = client.sessionId;
    player.name        = options.name  ?? "Joueur";
    player.color       = options.color ?? "#ffffff";
    player.isGM        = isGM;
    player.isConnected = true;
    this.state.players.set(client.sessionId, player);

    // ── Création du token associé au joueur ─────────────────────────────────
    // (équivalent du Instantiate(playerPrefab) de Unity)
    const token = new Token();
    token.id       = client.sessionId;
    token.ownerId  = client.sessionId;
    token.name     = options.name      ?? "Joueur";
    token.color    = options.color     ?? "#ffffff";
    token.avatarUrl = options.avatarUrl ?? "";
    token.hp       = options.hp    ?? 20;
    token.hpMax    = options.hpMax ?? 20;
    token.isGM     = isGM;
    // Position de spawn initiale — les joueurs arrivent en ligne sur la rangée 1
    token.tileX    = this.state.tokens.size;
    token.tileY    = 1;
    this.state.tokens.set(client.sessionId, token);

    // ── Enregistrement du GM ────────────────────────────────────────────────
    if (isGM && this.state.gmSessionId === "") {
      this.state.gmSessionId = client.sessionId;
      console.log(`[DungeonRoom] GM enregistré: ${client.sessionId}`);
    }
  }

  onLeave(client: Client): void {
    console.log(`[DungeonRoom] Joueur déconnecté: ${client.sessionId}`);

    // Marque le joueur comme déconnecté (le token reste sur la carte)
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.isConnected = false;
    }

    // Si le GM se déconnecte, libère le slot GM
    if (this.state.gmSessionId === client.sessionId) {
      this.state.gmSessionId = "";
      console.log("[DungeonRoom] Le GM s'est déconnecté — slot GM libéré");
    }
  }
}
