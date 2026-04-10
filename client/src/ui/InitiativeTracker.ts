// InitiativeTracker — overlay HTML affichant l'ordre d'initiative en combat
// Visible pour tous les joueurs (pas seulement le GM)
// Positionné en haut de l'écran, centré horizontalement

import type { MapSchema, ArraySchema } from "@colyseus/schema";
import type { Token } from "../../../server/src/schema/DungeonState";

export class InitiativeTracker {
  private container: HTMLDivElement;
  private listEl: HTMLDivElement;
  private titleEl: HTMLDivElement;

  constructor(
    private tokens: MapSchema<Token>,
    private initiativeOrder: ArraySchema<string>,
    private getCurrentTurnId: () => string,
    private getCurrentTurn: () => number,
  ) {
    this.container = document.createElement("div");
    this.container.id = "initiative-tracker";

    Object.assign(this.container.style, {
      position:        "fixed",
      top:             "0",
      left:            "50%",
      transform:       "translateX(-50%)",
      zIndex:          "90",
      background:      "rgba(10,10,25,0.88)",
      border:          "1px solid #7b2d8b",
      borderTop:       "none",
      borderRadius:    "0 0 8px 8px",
      padding:         "8px 16px 10px",
      fontFamily:      "monospace",
      fontSize:        "12px",
      color:           "white",
      display:         "none",
      pointerEvents:   "none",
      minWidth:        "200px",
    });

    // Titre : ⚔️ Combat — Round N
    this.titleEl = document.createElement("div");
    Object.assign(this.titleEl.style, {
      fontWeight:    "bold",
      marginBottom:  "6px",
      color:         "#c8a0d8",
      textAlign:     "center",
      fontSize:      "12px",
    });
    this.container.appendChild(this.titleEl);

    // Conteneur de la liste des combattants
    this.listEl = document.createElement("div");
    this.container.appendChild(this.listEl);

    document.body.appendChild(this.container);
  }

  // Met à jour l'affichage selon l'état de combat courant
  update(combatActive: boolean, currentTurnId: string, currentTurn: number): void {
    if (!combatActive) {
      this.container.style.display = "none";
      return;
    }

    this.container.style.display = "block";

    // Mettre à jour le titre
    const roundLabel = currentTurn > 0 ? String(currentTurn) : "—";
    this.titleEl.textContent = `⚔️ Combat — Round ${roundLabel}`;

    // Reconstruire la liste
    this.listEl.innerHTML = "";

    if (this.initiativeOrder.length === 0) {
      const empty = document.createElement("div");
      empty.textContent = "Aucun combattant";
      Object.assign(empty.style, { color: "#888888", fontStyle: "italic", textAlign: "center" });
      this.listEl.appendChild(empty);
      return;
    }

    this.initiativeOrder.forEach((tokenId: string) => {
      const token = this.tokens.get(tokenId);
      if (!token) return; // token déconnecté — ignorer

      const isActive = tokenId === currentTurnId;

      const row = document.createElement("div");
      Object.assign(row.style, {
        display:       "flex",
        alignItems:    "center",
        gap:           "6px",
        padding:       "2px 4px",
        borderRadius:  "3px",
        background:    isActive ? "rgba(255,215,0,0.15)" : "transparent",
        color:         isActive ? "#ffd700" : "white",
        marginBottom:  "2px",
      });

      // Préfixe ▶ si c'est le tour actif, sinon invisible (minWidth réserve l'espace)
      const prefix = document.createElement("span");
      prefix.textContent = isActive ? "▶" : "";
      Object.assign(prefix.style, { minWidth: "12px", textAlign: "center" });
      row.appendChild(prefix);

      // Point coloré (couleur du token)
      const colorDot = document.createElement("span");
      Object.assign(colorDot.style, {
        display:      "inline-block",
        width:        "8px",
        height:       "8px",
        borderRadius: "50%",
        background:   token.color ?? "#ffffff",
        flexShrink:   "0",
      });
      row.appendChild(colorDot);

      // Nom du token
      const nameSpan = document.createElement("span");
      nameSpan.textContent = token.name;
      Object.assign(nameSpan.style, { flex: "1" });
      row.appendChild(nameSpan);

      // HP courants en vert
      const hpSpan = document.createElement("span");
      hpSpan.textContent = `${token.hp}hp`;
      Object.assign(hpSpan.style, { color: "#88ff88", fontSize: "11px" });
      row.appendChild(hpSpan);

      this.listEl.appendChild(row);
    });
  }

  // Supprime l'overlay du DOM
  destroy(): void {
    this.container.remove();
  }
}
