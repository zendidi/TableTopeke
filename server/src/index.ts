import http from "http";
import express from "express";
import path from "path";
import { Server } from "colyseus";
import { monitor } from "@colyseus/monitor";
import { DungeonRoom } from "./rooms/DungeonRoom";

process.on("unhandledRejection", (reason) =>
  console.error("[FATAL] UnhandledRejection:", reason));
process.on("uncaughtException", (err) =>
  console.error("[FATAL] UncaughtException:", err));

const PORT = Number(process.env.PORT) || 2567;
const app  = express();

// ── Static : sert le build du client Vite ───────────────────────────────────
// Le serveur joue le rôle d'un "simple HTTP server" pour le front en production
const clientDist = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.use(express.json());

// ── Monitor Colyseus (tableau de bord des rooms) ─────────────────────────────
// Accessible sur /colyseus — équivalent du Network Manager window d'Unity
app.use("/colyseus", monitor());

// ── Serveur HTTP + WebSocket Colyseus ────────────────────────────────────────
const httpServer = http.createServer(app);
const gameServer = new Server({ server: httpServer });

// Enregistrement de la room principale
gameServer.define("dungeon", DungeonRoom);

// ── Démarrage ────────────────────────────────────────────────────────────────
gameServer.listen(PORT).then(() => {
  const hostname = process.env.HOST ?? "localhost";

  console.log("============================================");
  console.log("  TableTopeke — Serveur démarré ✔");
  console.log("============================================");
  console.log(`  🌐 Interface  : http://${hostname}:${PORT}`);
  console.log(`  🔌 WebSocket  : ws://${hostname}:${PORT}`);
  console.log(`  📊 Monitor    : http://${hostname}:${PORT}/colyseus`);
  console.log("============================================");
});
