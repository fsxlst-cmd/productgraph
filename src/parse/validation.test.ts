import { describe, expect, it } from "vitest";
import { parseFeatureVersion } from "./entities.js";
import {
  validateFeatureReferences,
  validateGoalReferences,
  validateMetricReferences,
  validateSupersedes,
} from "./validation.js";

function makeVersion(overrides: Partial<Record<string, string>> = {}) {
  const raw = `---
feature: checkout-flow
title: Checkout Flow
date: "${overrides.date ?? "2026-07-09"}"
status: active
goals: [reduce-churn]
metrics:
  - metric: d7-retention
related_features: [paypal-support]
depends_on: [auth]
${overrides.supersedes ? `supersedes: ${overrides.supersedes}` : ""}
---
`;
  return parseFeatureVersion(`prds/checkout-flow/${overrides.fileBaseName ?? "2026-07-09-refactor"}.md`, raw);
}

describe("validateGoalReferences", () => {
  it("returns no errors when all goal slugs are known", () => {
    expect(validateGoalReferences(makeVersion(), new Set(["reduce-churn"]))).toEqual([]);
  });

  it("returns an error identifying the file and the missing slug", () => {
    const errors = validateGoalReferences(makeVersion(), new Set());
    expect(errors).toHaveLength(1);
    expect(errors[0]?.file).toBe("prds/checkout-flow/2026-07-09-refactor.md");
    expect(errors[0]?.message).toContain("reduce-churn");
  });
});

describe("validateMetricReferences", () => {
  it("returns an error for an unresolved metric slug", () => {
    const errors = validateMetricReferences(makeVersion(), new Set());
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain("d7-retention");
  });

  it("returns no errors when the metric slug is known", () => {
    expect(validateMetricReferences(makeVersion(), new Set(["d7-retention"]))).toEqual([]);
  });
});

describe("validateFeatureReferences", () => {
  it("returns an error for an unresolved related_features slug", () => {
    const errors = validateFeatureReferences(makeVersion(), "related_features", new Set());
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain("paypal-support");
  });

  it("returns an error for an unresolved depends_on slug", () => {
    const errors = validateFeatureReferences(makeVersion(), "depends_on", new Set());
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain("auth");
  });

  it("returns no errors when all slugs are known", () => {
    const known = new Set(["paypal-support", "auth"]);
    expect(validateFeatureReferences(makeVersion(), "related_features", known)).toEqual([]);
    expect(validateFeatureReferences(makeVersion(), "depends_on", known)).toEqual([]);
  });
});

describe("validateSupersedes", () => {
  it("returns no errors when there is no supersedes field", () => {
    expect(validateSupersedes(makeVersion(), new Map())).toEqual([]);
  });

  it("returns no errors for a valid supersedes chain with an earlier date", () => {
    const older = makeVersion({ fileBaseName: "2026-06-15-add-paypal", date: "2026-06-15" });
    const newer = makeVersion({ supersedes: "2026-06-15-add-paypal" });
    const siblings = new Map([["2026-06-15-add-paypal", older]]);
    expect(validateSupersedes(newer, siblings)).toEqual([]);
  });

  it("errors when the supersedes target does not exist", () => {
    const newer = makeVersion({ supersedes: "does-not-exist" });
    const errors = validateSupersedes(newer, new Map());
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain("does-not-exist");
  });

  it("errors when the supersedes target's date is not strictly earlier", () => {
    const sameDate = makeVersion({ fileBaseName: "2026-07-09-other", date: "2026-07-09" });
    const newer = makeVersion({ supersedes: "2026-07-09-other" });
    const siblings = new Map([["2026-07-09-other", sameDate]]);
    const errors = validateSupersedes(newer, siblings);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain("not strictly earlier");
  });
});
