import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  // Déclare le dossier public pour les assets statiques (index.html, player-config.json...)
  publicDir: "public",
  build: {
    outDir:     "dist",
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
});
