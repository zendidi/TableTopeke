#!/usr/bin/env node
/**
 * generate-images-index.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Scanne tous les fichiers PNG du dossier client/public/images/ et génère
 * (ou met à jour) client/public/images/index.json.
 *
 * Usage :
 *   node tools/generate-images-index.js
 *   node tools/generate-images-index.js --tile-size 64   # taille de case (défaut : 64)
 *
 * Comportement :
 *   - Lit les dimensions réelles de chaque PNG via son en-tête (sans dépendance externe).
 *   - Calcule defaultWidthInTiles / defaultHeightInTiles = ceil(pixelDim / tileSize).
 *   - Si une entrée existe déjà dans index.json, ses champs label / defaultWidthInTiles /
 *     defaultHeightInTiles sont préservés (les nouvelles valeurs ne remplacent que celles
 *     qui n'ont jamais été définies manuellement).
 *   - Les fichiers PNG ajoutés/retirés du dossier sont automatiquement gérés.
 *
 * Format de sortie (images/index.json) :
 * {
 *   "_comment": "...",
 *   "images": [
 *     {
 *       "id":                   "salle-principale",
 *       "label":                "Salle Principale",
 *       "file":                 "salle-principale.png",
 *       "defaultWidthInTiles":  5,
 *       "defaultHeightInTiles": 4
 *     },
 *     ...
 *   ]
 * }
 */

"use strict";

const fs   = require("fs");
const path = require("path");

// ── Configuration ─────────────────────────────────────────────────────────────

const IMAGES_DIR  = path.join(__dirname, "..", "client", "public", "images");
const OUTPUT_FILE = path.join(IMAGES_DIR, "index.json");

// Taille d'une case de la grille en pixels (doit correspondre à EDITOR_TILE_SIZE)
let TILE_SIZE = 64;

// Lire --tile-size depuis les arguments CLI
const tsArg = process.argv.indexOf("--tile-size");
if (tsArg !== -1 && process.argv[tsArg + 1]) {
  const parsed = parseInt(process.argv[tsArg + 1], 10);
  if (!isNaN(parsed) && parsed > 0) {
    TILE_SIZE = parsed;
  } else {
    console.error(`[generate-images-index] Valeur invalide pour --tile-size : ${process.argv[tsArg + 1]}`);
    process.exit(1);
  }
}

// --force : recalcule toutes les valeurs depuis les pixels, ignore les overrides manuels
const FORCE = process.argv.includes("--force");

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Lit la largeur et la hauteur en pixels d'un fichier PNG
 * sans aucune dépendance externe (format PNG normalisé ISO 15948).
 * Renvoie null si le fichier n'est pas un PNG valide.
 */
function readPngDimensions(filePath) {
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const buf = fs.readFileSync(filePath);

  // Vérifier la signature PNG (8 octets)
  if (buf.length < 24) return null;
  for (let i = 0; i < 8; i++) {
    if (buf[i] !== PNG_SIGNATURE[i]) return null;
  }

  // Le premier chunk est toujours IHDR.
  // Structure : [4 octets longueur][4 octets type "IHDR"][4 octets width][4 octets height]…
  // Le type "IHDR" commence à l'octet 12, width à l'octet 16, height à l'octet 20.
  const width  = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

/**
 * Convertit un nom de fichier (sans extension) en libellé lisible.
 * Ex. : "salle-principale" → "Salle Principale"
 */
function toLabel(stem) {
  return stem
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Calcule le nombre de cases en arrondissant au supérieur, minimum 1.
 */
function toTiles(pixels) {
  return Math.max(1, Math.ceil(pixels / TILE_SIZE));
}

// ── Lecture des PNG existants ──────────────────────────────────────────────────

const pngFiles = fs
  .readdirSync(IMAGES_DIR)
  .filter((f) => f.toLowerCase().endsWith(".png"))
  .sort();

if (pngFiles.length === 0) {
  console.warn(`[generate-images-index] Aucun fichier PNG trouvé dans ${IMAGES_DIR}`);
  process.exit(0);
}

// ── Lecture de l'index existant (pour préserver les overrides manuels) ─────────

let existingEntries = [];
if (fs.existsSync(OUTPUT_FILE)) {
  try {
    const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
    existingEntries = existing.images ?? [];
  } catch {
    console.warn(`[generate-images-index] index.json existant illisible — il sera regénéré entièrement.`);
  }
}

/** Retrouve une entrée existante par son champ "file" */
function findExisting(fileName) {
  return existingEntries.find((e) => e.file === fileName) ?? null;
}

// ── Génération des entrées ─────────────────────────────────────────────────────

const images = [];

for (const file of pngFiles) {
  const filePath = path.join(IMAGES_DIR, file);
  const dims     = readPngDimensions(filePath);

  if (!dims) {
    console.warn(`[generate-images-index] Impossible de lire les dimensions de ${file} — ignoré.`);
    continue;
  }

  const stem     = path.basename(file, ".png");
  const existing = findExisting(file);

  // Calculer les valeurs par défaut à partir des dimensions réelles
  const computedW = toTiles(dims.width);
  const computedH = toTiles(dims.height);

  const entry = {
    id:   stem,
    // Conserver le label existant s'il a été personnalisé (sauf en mode --force)
    label: (!FORCE && existing?.label) ? existing.label : toLabel(stem),
    file,
    // En mode --force : toujours recalculer depuis les pixels.
    // Sinon : conserver les tailles existantes si elles ont été modifiées manuellement.
    defaultWidthInTiles:  (!FORCE && existing?.defaultWidthInTiles  != null) ? existing.defaultWidthInTiles  : computedW,
    defaultHeightInTiles: (!FORCE && existing?.defaultHeightInTiles != null) ? existing.defaultHeightInTiles : computedH,
  };

  images.push(entry);

  const src = (FORCE || !existing)
    ? `calculé depuis ${dims.width}×${dims.height} px`
    : "conservé";
  console.log(
    `  ✓ ${file.padEnd(30)} ${entry.defaultWidthInTiles}×${entry.defaultHeightInTiles} cases  (${src})`,
  );
}

// ── Écriture du fichier ────────────────────────────────────────────────────────

const output = {
  _comment: [
    "Généré automatiquement par tools/generate-images-index.js — relancez le script après avoir ajouté ou retiré des PNG.",
    "defaultWidthInTiles / defaultHeightInTiles : taille de placement par défaut dans l'éditeur (cases de 64 px).",
    "Ces valeurs sont calculées depuis les dimensions réelles du PNG. Modifiez-les manuellement si nécessaire ;",
    "elles seront préservées lors des prochains appels du script (utilisez --force pour tout recalculer).",
    "Note : dans un fichier de map (.json), une image peut être agrandie indépendamment de ces valeurs par défaut.",
  ].join(" "),
  images,
};

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n", "utf8");

console.log(`\n[generate-images-index] ${images.length} image(s) écrite(s) dans :\n  ${OUTPUT_FILE}`);
