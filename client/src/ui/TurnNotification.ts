// TurnNotification — toast HTML affiché quand c'est le tour du joueur courant
// Centré à l'écran, disparaît après 2500ms

export class TurnNotification {
  private container: HTMLDivElement;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.container = document.createElement("div");
    this.container.id = "turn-notification";

    Object.assign(this.container.style, {
      position:      "fixed",
      top:           "40%",
      left:          "50%",
      transform:     "translate(-50%, -50%)",
      zIndex:        "200",
      background:    "rgba(255,215,0,0.92)",
      color:         "#1a1a2e",
      fontSize:      "20px",
      fontWeight:    "bold",
      fontFamily:    "monospace",
      borderRadius:  "8px",
      padding:       "16px 32px",
      pointerEvents: "none",
      display:       "none",
      opacity:       "0",
      transition:    "opacity 200ms ease-in",
    });

    this.container.textContent = "🎲 C'est ton tour !";
    document.body.appendChild(this.container);
  }

  // Affiche le toast pendant 2500ms puis le masque
  show(): void {
    // Annuler le timer précédent si un toast est déjà en cours
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    // Afficher avec transition d'apparition
    this.container.style.display = "block";
    // Forcer un reflow pour que la transition CSS s'active
    void this.container.offsetHeight;
    this.container.style.opacity = "1";

    // Disparition après 2100ms (transition fade-out de 400ms pour atteindre 2500ms total)
    this.hideTimer = setTimeout(() => {
      this.container.style.transition = "opacity 400ms ease-out";
      this.container.style.opacity = "0";
      this.hideTimer = setTimeout(() => {
        this.container.style.display = "none";
        // Réinitialiser la transition pour la prochaine apparition
        this.container.style.transition = "opacity 200ms ease-in";
        this.hideTimer = null;
      }, 400);
    }, 2100);
  }

  // Supprime le toast du DOM
  destroy(): void {
    if (this.hideTimer !== null) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    this.container.remove();
  }
}
