import { Room, Client } from "colyseus";
import { DungeonState, Player, Token } from "../schema/DungeonState";

// Mot de passe GM — priorité à la variable d'environnement, fallback sur "admin"
// TODO (Phase 5) : remplacer par une authentification sécurisée
const GM_PASSWORD = process.env.GM_PASSWORD ?? "master1234";

// Position de repositionnement des tokens lors d'un changement de map (centre par défaut)
const DEFAULT_TOKEN_SPAWN = { x: 20, y: 20 };

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

// Résultat retourné par onAuth — transmis en 3e paramètre de onJoin
interface AuthData {
  isGM: boolean;
}

// Équivalent d'un NetworkRoomManager Unity
export class DungeonRoom extends Room<DungeonState> {

  // Nombre maximum de joueurs par salle
  maxClients = 20;

  // ── Authentification ─────────────────────────────────────────────────────
  // Vérifie le mot de passe GM avant d'autoriser l'entrée dans la room.
  // Un mauvais mot de passe ne rejette pas la connexion : le joueur rejoint en tant que joueur normal.
  // TODO (Phase 5) : remplacer le mot de passe hardcodé par une vraie auth sécurisée
  onAuth(_client: Client, options: JoinOptions): AuthData {
    const isGM = options.gmPassword === GM_PASSWORD;
    if (options.gmPassword !== undefined && !isGM) {
      console.warn(`[AUTH] Tentative GM refusée — mauvais mot de passe`);
    }
    console.log(`[AUTH] isGM: ${isGM}`);
    return { isGM };
  }

  onCreate(_options: Record<string, unknown>): void {
    this.setState(new DungeonState());

    // ── MOVE_TOKEN ──────────────────────────────────────────────────────────
    // Le propriétaire du token ou le GM peut le déplacer
    this.onMessage("MOVE_TOKEN", (client, data: { tokenId: string; tileX: number; tileY: number }) => {
      console.log(`[MSG] MOVE_TOKEN sessionId=${client.sessionId} payload=${JSON.stringify(data)}`);
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
      console.log(`[MSG] UPDATE_HP sessionId=${client.sessionId} payload=${JSON.stringify(data)}`);
      if (this.state.gmSessionId !== client.sessionId) return;

      const token = this.state.tokens.get(data.tokenId);
      if (!token) return;

      token.hp = Math.max(0, Math.min(data.hp, token.hpMax));
    });

    // ── TOGGLE_FOG ───────────────────────────────────────────────────────────
    // GM seulement — active/désactive le brouillard de guerre et le LOS
    this.onMessage("TOGGLE_FOG", (client, data: { fogEnabled?: boolean; losEnabled?: boolean }) => {
      console.log(`[MSG] TOGGLE_FOG sessionId=${client.sessionId} payload=${JSON.stringify(data)}`);
      if (this.state.gmSessionId !== client.sessionId) return;

      if (data.fogEnabled !== undefined) this.state.fogEnabled = data.fogEnabled;
      if (data.losEnabled !== undefined) this.state.losEnabled = data.losEnabled;
    });

    // ── SET_INITIATIVE ────────────────────────────────────────────────────────
    // GM seulement — définit l'ordre d'initiative pour le combat au tour par tour
    this.onMessage("SET_INITIATIVE", (client, data: { order: string[] }) => {
      console.log(`[MSG] SET_INITIATIVE sessionId=${client.sessionId} payload=${JSON.stringify(data)}`);
      if (client.sessionId !== this.state.gmSessionId) return;
      if (!Array.isArray(data.order)) return;

      this.state.initiativeOrder.clear();
      data.order.forEach((tokenId) => this.state.initiativeOrder.push(tokenId));
      console.log(`[STATE] initiativeOrder → [${data.order.join(", ")}]`);
    });

    // ── COMBAT_ACTION ─────────────────────────────────────────────────────────
    // GM seulement — contrôle du mode combat au tour par tour
    this.onMessage("COMBAT_ACTION", (client, data: { action: "start" | "end" | "next" }) => {
      console.log(`[MSG] COMBAT_ACTION sessionId=${client.sessionId} payload=${JSON.stringify(data)}`);
      if (this.state.gmSessionId !== client.sessionId) return;

      switch (data.action) {
        case "start":
          this.state.combatActive = true;
          this.state.currentTurn = 1;
          // Premier combattant = tête de l'ordre d'initiative
          this.state.currentTurnId = this.state.initiativeOrder[0] ?? "";
          console.log(`[STATE] currentTurn → ${this.state.currentTurn}, currentTurnId → ${this.state.currentTurnId}`);
          break;
        case "end":
          this.state.combatActive = false;
          this.state.currentTurn = 0;
          this.state.currentTurnId = "";
          this.state.initiativeOrder.clear();
          console.log(`[STATE] currentTurn → ${this.state.currentTurn}`);
          break;
        case "next": {
          if (!this.state.combatActive) return;
          this.state.currentTurn += 1;
          const order = this.state.initiativeOrder;
          if (order.length > 0) {
            const idx = order.indexOf(this.state.currentTurnId);
            // Si currentTurnId n'est pas dans l'ordre (idx === -1), repartir du début (idx 0)
            const nextIdx = (Math.max(0, idx) + 1) % order.length;
            this.state.currentTurnId = order[nextIdx];
          }
          console.log(`[STATE] currentTurn → ${this.state.currentTurn}, currentTurnId → ${this.state.currentTurnId}`);
          break;
        }
      }
    });

    // ── SET_TILE_SCALE ───────────────────────────────────────────────────────
    // GM seulement — définit la taille réelle d'une case (en mètres)
    this.onMessage("SET_TILE_SCALE", (client, data: { scale: number }) => {
      console.log(`[MSG] SET_TILE_SCALE sessionId=${client.sessionId} payload=${JSON.stringify(data)}`);
      if (this.state.gmSessionId !== client.sessionId) return;
      if (typeof data.scale !== "number" || data.scale <= 0) return;

      this.state.tileScale = data.scale;
      console.log(`[STATE] tileScale → ${this.state.tileScale}`);
    });

    // ── LOAD_MAP ─────────────────────────────────────────────────────────────
    // GM seulement — change la map active et repositionne tous les tokens
    type LoadMapMsg = { mapName: string };
    this.onMessage<LoadMapMsg>("LOAD_MAP", (client, msg) => {
      console.log(`[MSG] LOAD_MAP sessionId=${client.sessionId} payload=${JSON.stringify(msg)}`);
      // Vérification du rôle GM
      if (client.sessionId !== this.state.gmSessionId) return;
      if (!msg.mapName || typeof msg.mapName !== "string") return;

      // Mettre à jour l'état partagé → Colyseus broadcast automatiquement
      this.state.currentMap = msg.mapName;
      console.log(`[STATE] currentMap → ${this.state.currentMap}`);

      // Repositionner tous les tokens au centre de la nouvelle map
      this.state.tokens.forEach((token) => {
        token.tileX = DEFAULT_TOKEN_SPAWN.x;
        token.tileY = DEFAULT_TOKEN_SPAWN.y;
      });
    });

    console.log(`[ROOM] Salle créée — GM_PASSWORD=${process.env.GM_PASSWORD ? "(custom)" : "(défaut)"}`);
  }

  onJoin(client: Client, options: JoinOptions = {}, auth?: AuthData): void {
    console.log(`[ROOM] Joueur connecté: ${client.sessionId} (name="${options.name ?? "?"}")`);

    const isGM = auth?.isGM ?? false;

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
    token.id        = client.sessionId;
    token.ownerId   = client.sessionId;
    token.name      = options.name      ?? "Joueur";
    token.color     = options.color     ?? "#ffffff";
    token.avatarUrl = options.avatarUrl ?? "";
    token.hp        = options.hp    ?? 20;
    token.hpMax     = options.hpMax ?? 20;
    token.isGM      = isGM;
    token.isVisible = true;
    // Offset de spawn pour éviter la superposition des tokens
    const spawnIndex = this.state.tokens.size; // avant le set() courant
    token.tileX = DEFAULT_TOKEN_SPAWN.x + (spawnIndex % 5);
    token.tileY = DEFAULT_TOKEN_SPAWN.y + Math.floor(spawnIndex / 5);
    this.state.tokens.set(client.sessionId, token);

    // ── Enregistrement du GM ────────────────────────────────────────────────
    if (isGM && this.state.gmSessionId === "") {
      this.state.gmSessionId = client.sessionId;
      console.log(`[ROOM] GM enregistré: ${client.sessionId}`);
    }
  }

  async onLeave(client: Client, consented: boolean): Promise<void> {
    console.log(`[ROOM] Joueur déconnecté: ${client.sessionId} (consented=${consented})`);

    // Marquer le joueur comme déconnecté temporairement
    const player = this.state.players.get(client.sessionId);
    if (player) {
      player.isConnected = false;
    }

    if (!consented) {
      try {
        // Attendre une éventuelle reconnexion pendant 30 secondes
        await this.allowReconnection(client, 30);

        // Reconnecté avec succès — restaurer le statut du joueur
        const reconnectedPlayer = this.state.players.get(client.sessionId);
        if (reconnectedPlayer) {
          reconnectedPlayer.isConnected = true;
          console.log(`[ROOM] Joueur reconnecté: ${client.sessionId}`);
        }
        return;
      } catch {
        // Délai de reconnexion expiré — procéder à la suppression
        console.error(`[ERROR] Reconnexion expirée pour: ${client.sessionId}`);
      }
    }

    // Si le GM se déconnecte définitivement, libère le slot GM EN PREMIER
    if (this.state.gmSessionId === client.sessionId) {
      this.state.gmSessionId = "";
      console.log("[ROOM] Le GM s'est déconnecté — slot GM libéré");
    }

    // Supprimer le joueur et son token de la map
    this.state.players.delete(client.sessionId);
    this.state.tokens.delete(client.sessionId);
  }
}
