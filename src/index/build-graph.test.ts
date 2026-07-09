import { beforeEach, describe, expect, it } from "vitest";
import { GraphAccess } from "../db/access.js";
import { nodeId } from "../db/ids.js";
import { openWritableDb } from "../db/schema.js";
import { parseFeatureVersion, parseGoalRegistry, parseMetricRegistry } from "../parse/entities.js";
import { buildGraph } from "./build-graph.js";

function version(filePath: string, raw: string) {
  return parseFeatureVersion(filePath, raw);
}

describe("buildGraph", () => {
  let access: GraphAccess;

  beforeEach(() => {
    const db = openWritableDb(":memory:");
    access = new GraphAccess(db);

    const goal = parseGoalRegistry(
      "goals/reduce-churn.md",
      "---\ngoal: reduce-churn\ntitle: Reduce churn\n---\n",
    );
    const metric = parseMetricRegistry(
      "metrics/d7-retention.md",
      "---\nmetric: d7-retention\ntitle: Day-7 retention\n---\n",
    );

    const initial = version(
      "prds/checkout-flow/2026-03-01-initial.md",
      `---
feature: checkout-flow
title: Checkout Flow (initial)
date: "2026-03-01"
status: active
goals: []
metrics: []
---
`,
    );
    const refactor = version(
      "prds/checkout-flow/2026-07-09-refactor.md",
      `---
feature: checkout-flow
title: Checkout Flow
date: "2026-07-09"
status: active
goals: [reduce-churn]
metrics:
  - metric: d7-retention
    target: "25%"
    baseline: "20%"
related_features: [paypal-support]
supersedes: 2026-03-01-initial
---
`,
    );
    const paypal = version(
      "prds/paypal-support/2026-01-01-initial.md",
      `---
feature: paypal-support
title: PayPal Support
date: "2026-01-01"
status: active
---
`,
    );

    buildGraph(access, {
      goals: [goal],
      metrics: [metric],
      versionsByFeature: new Map([
        ["checkout-flow", [initial, refactor]],
        ["paypal-support", [paypal]],
      ]),
    });
  });

  it("creates one Feature node per feature using the latest version's title/status", () => {
    const feature = access.getFeature("checkout-flow");
    expect(feature?.title).toBe("Checkout Flow");
    expect(feature?.properties).toMatchObject({ status: "active", currentDate: "2026-07-09" });
  });

  it("creates a PRDVersion node per file, linked via HAS_VERSION", () => {
    const featureId = nodeId("Feature", "checkout-flow");
    const hasVersionEdges = access.getOutgoingEdges(featureId, "HAS_VERSION");
    expect(hasVersionEdges).toHaveLength(2);
  });

  it("creates a SUPERSEDES edge from the newer PRDVersion to the older one", () => {
    const newerId = nodeId("PRDVersion", "checkout-flow/2026-07-09-refactor");
    const supersedes = access.getOutgoingEdges(newerId, "SUPERSEDES");
    expect(supersedes).toHaveLength(1);
    expect(supersedes[0]?.toId).toBe(nodeId("PRDVersion", "checkout-flow/2026-03-01-initial"));
  });

  it("creates SERVES/TARGETS/RELATES_TO edges only from the latest version", () => {
    const featureId = nodeId("Feature", "checkout-flow");
    expect(access.getOutgoingEdges(featureId, "SERVES")).toHaveLength(1);
    expect(access.getOutgoingEdges(featureId, "TARGETS")).toHaveLength(1);
    expect(access.getOutgoingEdges(featureId, "RELATES_TO")).toHaveLength(1);
  });

  it("stores target/baseline on the TARGETS edge properties", () => {
    const featureId = nodeId("Feature", "checkout-flow");
    const [targets] = access.getOutgoingEdges(featureId, "TARGETS");
    expect(targets?.properties).toEqual({ target: "25%", baseline: "20%" });
  });

  it("reuses the same Goal/Metric node rather than duplicating it", () => {
    expect(access.listNodesByType("Goal")).toHaveLength(1);
    expect(access.listNodesByType("Metric")).toHaveLength(1);
  });
});

describe("buildGraph with a duplicate metric reference in one PRD", () => {
  it("does not throw, and keeps the last-listed target/baseline for that metric", () => {
    const db = openWritableDb(":memory:");
    const access = new GraphAccess(db);

    const metric = parseMetricRegistry(
      "metrics/d7-retention.md",
      "---\nmetric: d7-retention\ntitle: Day-7 retention\n---\n",
    );
    const dupeVersion = version(
      "prds/checkout-flow/2026-07-09-refactor.md",
      `---
feature: checkout-flow
title: Checkout Flow
date: "2026-07-09"
status: active
metrics:
  - metric: d7-retention
    target: "20%"
  - metric: d7-retention
    target: "25%"
---
`,
    );

    expect(() =>
      buildGraph(access, {
        goals: [],
        metrics: [metric],
        versionsByFeature: new Map([["checkout-flow", [dupeVersion]]]),
      }),
    ).not.toThrow();

    const featureId = nodeId("Feature", "checkout-flow");
    const targets = access.getOutgoingEdges(featureId, "TARGETS");
    expect(targets).toHaveLength(1);
    expect(targets[0]?.properties).toEqual({ target: "25%", baseline: null });
  });
});
