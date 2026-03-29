// Types partagés pour les deux formats de maps supportés par DungeonScene

/** Une image placée sur la grille dans une ImageMap */
export interface PlacedImage {
  id: string;            // identifiant unique de ce placement (ex: "img_0")
  src: string;           // chemin relatif depuis /public (ex: "images/salle-principale.png")
  x: number;             // position en cases depuis le coin haut-gauche
  y: number;
  widthInTiles: number;  // dimensions en cases
  heightInTiles: number;
}

/** Format JSON d'une map composée d'images (générée par l'éditeur) */
export interface ImageMapData {
  id: string;
  label: string;
  type: "image-map";    // discriminant pour différencier des maps Tiled
  widthInTiles: number; // dimensions totales de la map en cases
  heightInTiles: number;
  tileSize: number;     // taille d'une case en pixels (défaut : 64)
  images: PlacedImage[];
}

/** Entrée de maps/index.json */
export interface MapIndexEntry {
  id: string;
  label?: string;
  description?: string;
  type?: "tiled" | "image-map"; // défaut "tiled" si absent (rétrocompatibilité)
}

/** Format complet de maps/index.json */
export interface MapIndex {
  maps: MapIndexEntry[];
  defaultMap: string;
}
