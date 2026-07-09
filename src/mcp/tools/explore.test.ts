import { describe, expect, it } from "vitest";
import { buildFixtureAccess } from "./fixture.js";
import { exploreTool } from "./explore.js";

describe("exploreTool", () => {
  it("returns a feature's goals, metrics, related features, and recent history", () => {
    const { access } = buildFixtureAccess();
    const result = exploreTool(access, { type: "Feature", key: "checkout-flow" });

    expect(result.found).toBe(true);
    if (!result.found || !("goals" in result)) throw new Error("expected feature-mode result");
    expect(result.goals.map((g) => g.key)).toEqual(["reduce-churn"]);
    expect(result.metrics).toEqual([
      expect.objectContaining({ key: "d7-retention", target: "25%", baseline: "20%" }),
    ]);
    expect(result.relatedFeatures.map((f) => f.key)).toEqual(["paypal-support"]);
    expect(result.recentHistory.map((h) => h.key)).toEqual([
      "checkout-flow/2026-07-09-refactor",
      "checkout-flow/2026-03-01-initial",
    ]);
  });

  it("returns the features that serve a goal, in goal mode", () => {
    const { access } = buildFixtureAccess();
    const result = exploreTool(access, { type: "Goal", key: "reduce-churn" });

    expect(result.found).toBe(true);
    if (!result.found || !("features" in result)) throw new Error("expected goal-mode result");
    expect(result.features.map((f) => f.key)).toEqual(["checkout-flow"]);
  });

  it("returns the features that target a metric, in metric mode", () => {
    const { access } = buildFixtureAccess();
    const result = exploreTool(access, { type: "Metric", key: "d7-retention" });

    expect(result.found).toBe(true);
    if (!result.found || !("features" in result)) throw new Error("expected metric-mode result");
    expect(result.features.map((f) => f.key).sort()).toEqual(["checkout-flow", "paypal-support"]);
  });

  it("returns found: false for an unknown key", () => {
    const { access } = buildFixtureAccess();
    expect(exploreTool(access, { type: "Feature", key: "does-not-exist" })).toEqual({ found: false });
  });
});
