// GMPanel — panneau de contrôle HTML overlay réservé au Game Master
// Positionné en overlay sur le canvas Phaser via position fixed CSS
// Équivalent du panneau GM Unity (Inspector + custom EditorWindow)

export class GMPanel {
  private container: HTMLDivElement;

  constructor(
    private mapsIndex: Array<{ id: string; label?: string }>,
    private currentMap: string,
    private onLoadMap: (mapName: string) => void,
    private onToggleFog: (fog?: boolean, los?: boolean) => void,
    private onCombat: (action: "start" | "end" | "nextTurn") => void,
    private onSetTileScale: (scale: number) => void,
  ) {
    this.container = document.createElement("div");
    this.container.id = "gm-panel";

    // Style inline : overlay fixe, coin haut-droit, z-index élevé
    Object.assign(this.container.style, {
      position:        "fixed",
      right:           "0",
      top:             "0",
      zIndex:          "100",
      background:      "rgba(20,20,40,0.92)",
      color:           "white",
      padding:         "16px",
      borderLeft:      "2px solid #7b2d8b",
      minWidth:        "220px",
      fontFamily:      "monospace",
      fontSize:        "13px",
      maxHeight:       "100vh",
      overflowY:       "auto",
      boxSizing:       "border-box",
    });

    this._build();
    document.body.appendChild(this.container);
  }

  // Construit le HTML interne du panneau avec toutes les sections
  private _build(): void {
    this.container.innerHTML = "";

    // ── Titre ────────────────────────────────────────────────────────────────
    const titre = document.createElement("h3");
    titre.textContent = "🎲 Panneau Game Master";
    Object.assign(titre.style, { margin: "0 0 12px 0", fontSize: "14px", borderBottom: "1px solid #7b2d8b", paddingBottom: "8px" });
    this.container.appendChild(titre);

    // ── Section Maps ─────────────────────────────────────────────────────────
    this.container.appendChild(this._buildSection("🗺️ Map active", this._buildMapSection()));

    // ── Section Combat ───────────────────────────────────────────────────────
    this.container.appendChild(this._buildSection("⚔️ Combat", this._buildCombatSection()));

    // ── Section Fog of War ───────────────────────────────────────────────────
    this.container.appendChild(this._buildSection("👁️ Fog of War", this._buildFogSection()));

    // ── Section Échelle ──────────────────────────────────────────────────────
    this.container.appendChild(this._buildSection("📐 Échelle", this._buildScaleSection()));
  }

  // Crée un bloc de section avec titre et contenu
  private _buildSection(label: string, content: HTMLElement): HTMLDivElement {
    const section = document.createElement("div");
    Object.assign(section.style, { marginBottom: "14px" });

    const sectionTitre = document.createElement("div");
    sectionTitre.textContent = label;
    Object.assign(sectionTitre.style, { fontWeight: "bold", marginBottom: "6px", color: "#c8a0d8" });
    section.appendChild(sectionTitre);
    section.appendChild(content);
    return section;
  }

  // Section sélection de map
  private _buildMapSection(): HTMLElement {
    const wrapper = document.createElement("div");

    // Affichage de la map active
    const mapActive = document.createElement("div");
    mapActive.id = "gm-panel-current-map";
    mapActive.textContent = this.currentMap;
    Object.assign(mapActive.style, { marginBottom: "6px", color: "#88ff88", fontSize: "12px" });
    wrapper.appendChild(mapActive);

    // Sélecteur de map
    const select = document.createElement("select");
    select.id = "gm-panel-map-select";
    Object.assign(select.style, {
      width:           "100%",
      background:      "#1a1a2e",
      color:           "white",
      border:          "1px solid #7b2d8b",
      padding:         "4px",
      marginBottom:    "6px",
      fontFamily:      "monospace",
      fontSize:        "12px",
    });

    if (this.mapsIndex.length === 0) {
      // Fallback si l'index est vide
      const opt = document.createElement("option");
      opt.value = "grande-salle";
      opt.textContent = "Grande Salle";
      select.appendChild(opt);
    } else {
      this.mapsIndex.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.label ?? m.id;
        if (m.id === this.currentMap) opt.selected = true;
        select.appendChild(opt);
      });
    }
    wrapper.appendChild(select);

    // Bouton de chargement
    const btnLoad = document.createElement("button");
    btnLoad.textContent = "Charger cette map";
    Object.assign(btnLoad.style, this._btnStyle("#7b2d8b"));
    btnLoad.addEventListener("click", () => {
      const selected = (document.getElementById("gm-panel-map-select") as HTMLSelectElement)?.value;
      if (selected) this.onLoadMap(selected);
    });
    wrapper.appendChild(btnLoad);

    return wrapper;
  }

  // Section contrôle du combat
  private _buildCombatSection(): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.gap = "4px";
    wrapper.style.flexWrap = "wrap";

    const btnStart = document.createElement("button");
    btnStart.textContent = "Démarrer";
    Object.assign(btnStart.style, this._btnStyle("#2d8b2d"));
    btnStart.addEventListener("click", () => this.onCombat("start"));

    const btnEnd = document.createElement("button");
    btnEnd.textContent = "Fin";
    Object.assign(btnEnd.style, this._btnStyle("#8b2d2d"));
    btnEnd.addEventListener("click", () => this.onCombat("end"));

    const btnNext = document.createElement("button");
    btnNext.textContent = "→ Tour suivant";
    Object.assign(btnNext.style, this._btnStyle("#2d5a8b"));
    btnNext.addEventListener("click", () => this.onCombat("nextTurn"));

    wrapper.appendChild(btnStart);
    wrapper.appendChild(btnEnd);
    wrapper.appendChild(btnNext);
    return wrapper;
  }

  // Section activation Fog of War et LOS
  private _buildFogSection(): HTMLElement {
    const wrapper = document.createElement("div");

    wrapper.appendChild(this._buildCheckbox("Fog global", "gm-fog-global", (checked) => {
      this.onToggleFog(checked, undefined);
    }));

    wrapper.appendChild(this._buildCheckbox("LOS (Ligne de vue)", "gm-fog-los", (checked) => {
      this.onToggleFog(undefined, checked);
    }));

    return wrapper;
  }

  // Section échelle de la grille
  private _buildScaleSection(): HTMLElement {
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "6px";

    const label = document.createElement("span");
    label.textContent = "1 case =";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0.1";
    input.step = "0.5";
    input.value = "1.5";
    Object.assign(input.style, {
      width:       "55px",
      background:  "#1a1a2e",
      color:       "white",
      border:      "1px solid #7b2d8b",
      padding:     "3px",
      fontFamily:  "monospace",
      fontSize:    "12px",
    });

    const unit = document.createElement("span");
    unit.textContent = "m";

    const btnApply = document.createElement("button");
    btnApply.textContent = "Appliquer";
    Object.assign(btnApply.style, this._btnStyle("#5a5a8b"));
    btnApply.addEventListener("click", () => {
      const val = parseFloat(input.value);
      if (!isNaN(val) && val > 0) this.onSetTileScale(val);
    });

    wrapper.appendChild(label);
    wrapper.appendChild(input);
    wrapper.appendChild(unit);
    wrapper.appendChild(btnApply);
    return wrapper;
  }

  // Crée une checkbox avec label et callback
  private _buildCheckbox(labelText: string, id: string, onChange: (checked: boolean) => void): HTMLLabelElement {
    const label = document.createElement("label");
    Object.assign(label.style, { display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", cursor: "pointer" });

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = id;
    checkbox.addEventListener("change", () => onChange(checkbox.checked));

    const span = document.createElement("span");
    span.textContent = labelText;

    label.appendChild(checkbox);
    label.appendChild(span);
    return label;
  }

  // Style de base partagé pour tous les boutons du panel
  private _btnStyle(bgColor: string): Partial<CSSStyleDeclaration> {
    return {
      background:  bgColor,
      color:       "white",
      border:      "none",
      padding:     "5px 8px",
      cursor:      "pointer",
      fontFamily:  "monospace",
      fontSize:    "11px",
      borderRadius: "3px",
    };
  }

  // Met à jour l'affichage de la map active dans le panel
  updateCurrentMap(mapName: string): void {
    this.currentMap = mapName;
    const mapActiveEl = document.getElementById("gm-panel-current-map");
    if (mapActiveEl) mapActiveEl.textContent = mapName;

    // Synchroniser le sélecteur
    const select = document.getElementById("gm-panel-map-select") as HTMLSelectElement | null;
    if (select) select.value = mapName;
  }

  // Supprime le panneau du DOM
  destroy(): void {
    this.container.remove();
  }
}
