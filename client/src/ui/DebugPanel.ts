// DebugPanel — panneau de débogage HTML overlay, activé avec la touche ` (backtick)
// Affiche : FPS, sessionId, rôle GM, map active, nombre de tokens, état Colyseus
// Non visible par défaut — appuyer sur ` (backtick) pour basculer l'affichage

import type { Room } from "colyseus.js";
import type { DungeonState } from "../../../server/src/schema/DungeonState";

export class DebugPanel {
  private container: HTMLDivElement;
  private visible: boolean = false;
  private fpsText!: HTMLSpanElement;
  private sessionText!: HTMLSpanElement;
  private roleText!: HTMLSpanElement;
  private mapText!: HTMLSpanElement;
  private tokenCountText!: HTMLSpanElement;
  private pingText!: HTMLSpanElement;
  private lastFrameTime: number = performance.now();
  private frameCount: number = 0;
  private animFrameId: number = 0;
  private _boundKeydown: (e: KeyboardEvent) => void;

  constructor(private room: Room<DungeonState>, private isGM: boolean) {
    this.container = document.createElement("div");
    this.container.id = "debug-panel";
    this._applyStyle();
    this._buildContent();
    document.body.appendChild(this.container);

    // Masqué par défaut
    this.container.style.display = "none";

    // Référence liée nécessaire pour pouvoir retirer le listener dans destroy()
    this._boundKeydown = (e: KeyboardEvent) => { if (e.key === "`") this._toggle(); };
    window.addEventListener("keydown", this._boundKeydown);

    this._startFpsLoop();
  }

  private _applyStyle(): void {
    Object.assign(this.container.style, {
      position:    "fixed",
      left:        "0",
      bottom:      "0",
      zIndex:      "200",
      background:  "rgba(0,0,0,0.78)",
      color:       "#00ff88",
      padding:     "8px 12px",
      fontFamily:  "monospace",
      fontSize:    "11px",
      lineHeight:  "1.6",
      borderTop:   "1px solid #00ff88",
      borderRight: "1px solid #00ff88",
      minWidth:    "260px",
      pointerEvents: "none",
    });
  }

  private _buildContent(): void {
    this.container.innerHTML = "";

    const title = document.createElement("div");
    title.textContent = "🐛 DEBUG  [ ` pour fermer ]";
    Object.assign(title.style, { color: "#ffdd44", fontWeight: "bold", marginBottom: "4px" });
    this.container.appendChild(title);

    this.fpsText        = this._addRow("FPS");
    this.pingText       = this._addRow("Ping");
    this.sessionText    = this._addRow("Session");
    this.roleText       = this._addRow("Rôle");
    this.mapText        = this._addRow("Map");
    this.tokenCountText = this._addRow("Tokens");
  }

  private _addRow(label: string): HTMLSpanElement {
    const row = document.createElement("div");
    const labelEl = document.createElement("span");
    labelEl.textContent = `${label}: `;
    Object.assign(labelEl.style, { color: "#aaaaaa" });

    const valueEl = document.createElement("span");
    valueEl.textContent = "—";

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    this.container.appendChild(row);
    return valueEl;
  }

  private _toggle(): void {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? "block" : "none";
  }

  private _startFpsLoop(): void {
    const tick = () => {
      this.frameCount++;
      const now = performance.now();
      const elapsed = now - this.lastFrameTime;

      if (elapsed >= 500) {
        const fps = Math.round((this.frameCount / elapsed) * 1000);
        this.frameCount = 0;
        this.lastFrameTime = now;

        if (this.visible) this._refresh(fps);
      }

      this.animFrameId = requestAnimationFrame(tick);
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  private _refresh(fps: number): void {
    this.fpsText.textContent        = `${fps}`;
    this.sessionText.textContent    = this.room.sessionId ?? "—";
    this.roleText.textContent       = this.isGM ? "GM 🎲" : "Joueur ⚔️";
    this.mapText.textContent        = this.room.state?.currentMap ?? "—";
    this.tokenCountText.textContent = `${this.room.state?.tokens?.size ?? 0}`;

    this.pingText.textContent = "n/a (voir Network DevTools)";
  }

  // Appelé lors du shutdown de la scène pour nettoyer le DOM et arrêter la boucle
  destroy(): void {
    cancelAnimationFrame(this.animFrameId);
    window.removeEventListener("keydown", this._boundKeydown);
    this.container.remove();
  }
}
