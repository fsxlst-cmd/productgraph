import Database from "better-sqlite3";
import { GraphAccess } from "../../db/access.js";
import { openWritableDb } from "../../db/schema.js";
import { buildGraph } from "../../index/build-graph.js";
import { parseFeatureVersion, parseGoalRegistry, parseMetricRegistry } from "../../parse/entities.js";

/**
 * Builds an in-memory graph shared by all MCP tool tests: two features
 * (one with two chained versions), a shared goal, and a shared metric.
 */
export function buildFixtureAccess(): { db: Database.Database; access: GraphAccess } {
  const db = openWritableDb(":memory:");
  const access = new GraphAccess(db);

  const goal = parseGoalRegistry(
    "goals/reduce-churn.md",
    "---\ngoal: reduce-churn\ntitle: Reduce churn\n---\n",
  );
  const metric = parseMetricRegistry(
    "metrics/d7-retention.md",
    "---\nmetric: d7-retention\ntitle: Day-7 retention\nunit: percent\n---\n",
  );

  const checkoutInitial = parseFeatureVersion(
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
  const checkoutRefactor = parseFeatureVersion(
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
  const paypal = parseFeatureVersion(
    "prds/paypal-support/2026-01-01-initial.md",
    `---
feature: paypal-support
title: PayPal Support
date: "2026-01-01"
status: active
depends_on: [checkout-flow]
metrics:
  - metric: d7-retention
---
`,
  );

  buildGraph(access, {
    goals: [goal],
    metrics: [metric],
    versionsByFeature: new Map([
      ["checkout-flow", [checkoutInitial, checkoutRefactor]],
      ["paypal-support", [paypal]],
    ]),
  });

  return { db, access };
}
