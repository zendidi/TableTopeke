// ImagePalette — panel HTML overlay côté gauche, visible uniquement dans MapEditorScene
// Affiche la liste des images disponibles depuis images/index.json

/** Métadonnées d'une image affichée dans la palette */
interface ImageEntry {
  id: string;
  label: string;
  file: string;
}

export class ImagePalette {
  private container: HTMLDivElement;
  private onSelect: (imageId: string) => void;
  private selectedId: string | null = null;
  private items: Map<string, HTMLDivElement> = new Map();

  constructor(
    images: ImageEntry[],
    onSelect: (imageId: string) => void,
  ) {
    this.onSelect = onSelect;

    this.container = document.createElement("div");
    this.container.id = "image-palette";

    // Panel fixe côté gauche
    Object.assign(this.container.style, {
      position:   "fixed",
      left:       "0",
      top:        "50px",
      width:      "160px",
      background: "rgba(20,20,40,0.95)",
      color:      "white",
      padding:    "8px",
      borderRight: "2px solid #7b2d8b",
      overflowY:  "auto",
      maxHeight:  "calc(90vh - 50px)",
      zIndex:     "100",
      fontFamily: "monospace",
      fontSize:   "12px",
      boxSizing:  "border-box",
    });

    this._build(images);
    document.body.appendChild(this.container);
  }

  // Construit le contenu de la palette
  private _build(images: ImageEntry[]): void {
    const titre = document.createElement("div");
    titre.textContent = "🖼️ Images";
    Object.assign(titre.style, {
      fontWeight:    "bold",
      marginBottom:  "8px",
      color:         "#c8a0d8",
      fontSize:      "13px",
      borderBottom:  "1px solid #7b2d8b",
      paddingBottom: "4px",
    });
    this.container.appendChild(titre);

    images.forEach((img) => {
      const item = document.createElement("div");
      Object.assign(item.style, {
        marginBottom: "8px",
        padding:      "4px",
        borderRadius: "3px",
        border:       "1px solid transparent",
        cursor:       "pointer",
      });

      // Miniature de l'image
      const thumb = document.createElement("img");
      thumb.src   = `images/${img.file}`;
      thumb.alt   = img.label;
      Object.assign(thumb.style, {
        width:       "100%",
        height:      "60px",
        objectFit:   "cover",
        display:     "block",
        marginBottom: "4px",
        borderRadius: "2px",
      });
      item.appendChild(thumb);

      // Label
      const label = document.createElement("div");
      label.textContent = img.label;
      Object.assign(label.style, { fontSize: "11px", marginBottom: "4px", textAlign: "center" });
      item.appendChild(label);

      // Bouton "Placer"
      const btn = document.createElement("button");
      btn.textContent = "Placer";
      Object.assign(btn.style, {
        width:        "100%",
        background:   "#7b2d8b",
        color:        "white",
        border:       "none",
        padding:      "3px 6px",
        cursor:       "pointer",
        fontFamily:   "monospace",
        fontSize:     "11px",
        borderRadius: "3px",
      });
      btn.addEventListener("click", () => {
        this.setSelected(img.id);
        this.onSelect(img.id);
      });
      item.appendChild(btn);

      this.items.set(img.id, item);
      this.container.appendChild(item);
    });
  }

  // Met en surbrillance l'item correspondant à l'imageId sélectionné
  setSelected(imageId: string | null): void {
    this.selectedId = imageId;
    this.items.forEach((item, id) => {
      item.style.border = id === imageId ? "1px solid #7b2d8b" : "1px solid transparent";
      item.style.background = id === imageId ? "rgba(123,45,139,0.3)" : "transparent";
    });
  }

  // Supprime le panel du DOM
  destroy(): void {
    this.container.remove();
  }
}
