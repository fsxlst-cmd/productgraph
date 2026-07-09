import { describe, expect, it } from "vitest";
import { buildFixtureAccess } from "./fixture.js";
import { historyTool } from "./history.js";

describe("historyTool", () => {
  it("lists all versions chronologically, with a diff against the previous version", () => {
    const { access } = buildFixtureAccess();
    const result = historyTool(access, { feature: "checkout-flow" });

    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.versions.map((v) => v.key)).toEqual([
      "checkout-flow/2026-03-01-initial",
      "checkout-flow/2026-07-09-refactor",
    ]);
    expect(result.versions[0]?.changedFromPrevious).toBeNull();
    expect(result.versions[1]?.changedFromPrevious).toEqual({
      goals: { from: [], to: ["reduce-churn"] },
      metrics: { from: [], to: [{ metric: "d7-retention", target: "25%", baseline: "20%" }] },
      related_features: { from: [], to: ["paypal-support"] },
    });
  });

  it("returns a single entry with no diff for a feature with only one version", () => {
    const { access } = buildFixtureAccess();
    const result = historyTool(access, { feature: "paypal-support" });

    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.versions).toHaveLength(1);
    expect(result.versions[0]?.changedFromPrevious).toBeNull();
  });

  it("returns found: false for an unknown feature", () => {
    const { access } = buildFixtureAccess();
    expect(historyTool(access, { feature: "does-not-exist" })).toEqual({ found: false });
  });
});
