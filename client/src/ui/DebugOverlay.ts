// DebugOverlay — overlay de debug togglé par F1, visible pour tous les joueurs
// Affiché en bas-à-gauche, fond sombre, texte vert monospace
// Mis à jour toutes les 500 ms — caché par défaut jusqu'à l'appui sur F1

export interface DebugStats {
  zoom:        number;
  mapName:     string;
  tokenCount:  number;
  playerCount: number;
  sessionId:   string;
}

export class DebugOverlay {
  private static lastError: string = "—";

  private container: HTMLDivElement;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private scene: Phaser.Scene, private getStats: () => DebugStats) {
    this.container = document.createElement("div");
    this._applyStyle();
    document.body.appendChild(this.container);
    this._startInterval();
  }

  private _applyStyle(): void {
    Object.assign(this.container.style, {
      position:     "fixed",
      left:         "8px",
      bottom:       "8px",
      zIndex:       "999",
      background:   "rgba(0, 0, 0, 0.75)",
      color:        "#00ff88",
      fontFamily:   "monospace",
      fontSize:     "12px",
      padding:      "8px 12px",
      borderRadius: "4px",
      whiteSpace:   "pre",
      lineHeight:   "1.6",
      pointerEvents: "none",
      display:      "none",
    });
  }

  private _startInterval(): void {
    this.intervalId = setInterval(() => {
      if (this.container.style.display === "none") return;
      this._refresh();
    }, 500);
  }

  private _refresh(): void {
    const fps   = Math.round(this.scene.game.loop.actualFps);
    const stats = this.getStats();

    this.container.textContent = [
      `FPS      : ${fps}`,
      `Zoom     : ${stats.zoom.toFixed(2)}×`,
      `Map      : ${stats.mapName}`,
      `Tokens   : ${stats.tokenCount}`,
      `Joueurs  : ${stats.playerCount}`,
      `Session  : ${stats.sessionId}`,
      `Erreur   : ${DebugOverlay.lastError}`,
    ].join("\n");
  }

  toggle(): void {
    const isHidden = this.container.style.display === "none";
    this.container.style.display = isHidden ? "block" : "none";
    // Rafraîchissement immédiat à l'affichage pour éviter un délai d'une demi-seconde
    if (isHidden) this._refresh();
  }

  destroy(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.container.remove();
  }

  // Stocke le dernier message d'erreur affiché dans l'overlay
  // ET dans window.__lastError pour accès console navigateur
  static setLastError(msg: string): void {
    DebugOverlay.lastError = msg;
    (window as Window & { __lastError?: string }).__lastError = msg;
  }
}
