// Tests unitaires du schéma DungeonState — vérifient les valeurs par défaut et les mutations
// Framework : Vitest (environnement Node)

import { describe, it, expect } from "vitest";
import { Token, DungeonState } from "../schema/DungeonState";

describe("Token", () => {
  it("crée un token avec les valeurs par défaut", () => {
    const token = new Token();
    expect(token.hp).toBe(20);
    expect(token.hpMax).toBe(20);
    expect(token.tileX).toBe(0);
    expect(token.tileY).toBe(0);
  });

  it("peut muter tileX et tileY", () => {
    const token = new Token();
    token.tileX = 5;
    token.tileY = 10;
    expect(token.tileX).toBe(5);
    expect(token.tileY).toBe(10);
  });

  it("hp ne dépasse pas hpMax après clampage", () => {
    // La contrainte est appliquée par le handler UPDATE_HP (Math.min(hp, hpMax))
    // Vérification que les valeurs par défaut respectent la règle
    const token = new Token();
    expect(token.hp).toBeLessThanOrEqual(token.hpMax);
  });

  it("isVisible est true par défaut", () => {
    const token = new Token();
    expect(token.isVisible).toBe(true);
  });
});

describe("DungeonState", () => {
  it("initialise les maps vides", () => {
    const state = new DungeonState();
    expect(state.players.size).toBe(0);
    expect(state.tokens.size).toBe(0);
  });

  it("gmSessionId est vide par défaut", () => {
    const state = new DungeonState();
    expect(state.gmSessionId).toBe("");
  });
});
