// Tests unitaires du GMPanel — vérifient l'insertion DOM, le destroy, l'état vide et le bouton de chargement
// Framework : Vitest (environnement jsdom)

import { describe, it, expect, vi, afterEach } from "vitest";
import { GMPanel } from "../ui/GMPanel";

// Mock minimal de MapSchema compatible avec les méthodes utilisées dans GMPanel
class MockMapSchema<T> {
  private _map = new Map<string, T>();

  get size(): number {
    return this._map.size;
  }

  set(key: string, value: T): this {
    this._map.set(key, value);
    return this;
  }

  get(key: string): T | undefined {
    return this._map.get(key);
  }

  has(key: string): boolean {
    return this._map.has(key);
  }

  delete(key: string): boolean {
    return this._map.delete(key);
  }

  forEach(cb: (value: T, key: string) => void): void {
    this._map.forEach((v, k) => cb(v, k));
  }
}

// Crée un GMPanel avec des valeurs par défaut minimalistes
function createPanel(overrides: {
  mapsIndex?: Array<{ id: string; label?: string }>;
  currentMap?: string;
  onLoadMap?: (mapName: string) => void;
  players?: MockMapSchema<any>;
  tokens?: MockMapSchema<any>;
} = {}): GMPanel {
  return new GMPanel(
    overrides.mapsIndex ?? [],
    overrides.currentMap ?? "grande-salle",
    overrides.onLoadMap ?? vi.fn(),
    vi.fn(),
    vi.fn(),
    vi.fn(),
    vi.fn(),
    (overrides.players ?? new MockMapSchema()) as any,
    (overrides.tokens ?? new MockMapSchema()) as any,
    vi.fn(),
    1.5,
  );
}

// Nettoyer le DOM après chaque test
afterEach(() => {
  document.body.innerHTML = "";
});

// ── Insertion dans le DOM ─────────────────────────────────────────────────────

describe("GMPanel construction", () => {
  it("s'insère dans document.body à la construction", () => {
    createPanel();
    const panel = document.getElementById("gm-panel");
    expect(panel).not.toBeNull();
    expect(document.body.contains(panel)).toBe(true);
  });
});

// ── destroy() ─────────────────────────────────────────────────────────────────

describe("GMPanel.destroy()", () => {
  it("retire le panel du DOM", () => {
    const panel = createPanel();
    expect(document.getElementById("gm-panel")).not.toBeNull();

    panel.destroy();

    expect(document.getElementById("gm-panel")).toBeNull();
  });
});

// ── Liste des joueurs vide ────────────────────────────────────────────────────

describe("GMPanel joueurs", () => {
  it("affiche 'Aucun joueur connecté' quand players.size === 0", () => {
    createPanel({ players: new MockMapSchema() });

    const listEl = document.getElementById("gm-panel-players-list");
    expect(listEl).not.toBeNull();
    expect(listEl!.textContent).toContain("Aucun joueur connecté");
  });
});

// ── Bouton "Charger cette map" ─────────────────────────────────────────────────

describe("GMPanel bouton Charger cette map", () => {
  it("appelle onLoadMap avec la valeur du select", () => {
    const onLoadMap = vi.fn();
    const mapsIndex = [
      { id: "grande-salle", label: "Grande Salle" },
      { id: "donjon-secret", label: "Donjon Secret" },
    ];

    createPanel({ mapsIndex, onLoadMap, currentMap: "grande-salle" });

    // Sélectionner la deuxième map dans le sélecteur
    const select = document.getElementById("gm-panel-map-select") as HTMLSelectElement;
    expect(select).not.toBeNull();
    select.value = "donjon-secret";

    // Cliquer sur le bouton de chargement
    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent === "Charger cette map",
    );
    expect(btn).not.toBeUndefined();
    btn!.click();

    expect(onLoadMap).toHaveBeenCalledWith("donjon-secret");
  });
});
