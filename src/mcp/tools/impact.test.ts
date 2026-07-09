import { describe, expect, it } from "vitest";
import { buildFixtureAccess } from "./fixture.js";
import { impactTool } from "./impact.js";

describe("impactTool", () => {
  it("lists features that depend on or relate to a given feature", () => {
    const { access } = buildFixtureAccess();
    const result = impactTool(access, { type: "Feature", key: "checkout-flow" });

    expect(result.found).toBe(true);
    if (!result.found || !("dependentFeatures" in result)) throw new Error("expected feature-mode result");
    expect(result.dependentFeatures.map((f) => f.key)).toEqual(["paypal-support"]);
    expect(result.relatedFeatures).toEqual([]);
  });

  it("lists features that relate to a feature that is the target of RELATES_TO", () => {
    const { access } = buildFixtureAccess();
    const result = impactTool(access, { type: "Feature", key: "paypal-support" });

    expect(result.found).toBe(true);
    if (!result.found || !("relatedFeatures" in result)) throw new Error("expected feature-mode result");
    expect(result.relatedFeatures.map((f) => f.key)).toEqual(["checkout-flow"]);
  });

  it("lists every feature that targets a shared metric", () => {
    const { access } = buildFixtureAccess();
    const result = impactTool(access, { type: "Metric", key: "d7-retention" });

    expect(result.found).toBe(true);
    if (!result.found || !("features" in result)) throw new Error("expected metric-mode result");
    expect(result.features.map((f) => f.key).sort()).toEqual(["checkout-flow", "paypal-support"]);
  });

  it("returns found: false for an unknown key", () => {
    const { access } = buildFixtureAccess();
    expect(impactTool(access, { type: "Feature", key: "does-not-exist" })).toEqual({ found: false });
  });
});
