import { describe, expect, it } from "vitest";
import { IndexError } from "./errors.js";
import { parseFeatureVersion, parseGoalRegistry, parseMetricRegistry } from "./entities.js";

const validFeatureRaw = `---
feature: checkout-flow
title: Checkout Flow
date: "2026-07-09"
status: active
goals: [reduce-churn]
metrics:
  - metric: d7-retention
    target: 25%
    baseline: 20%
related_features: [paypal-support]
depends_on: []
---

## Why

Because.
`;

describe("parseFeatureVersion", () => {
  it("parses valid frontmatter and derives slug/base name from the path", () => {
    const version = parseFeatureVersion("prds/checkout-flow/2026-07-09-refactor.md", validFeatureRaw);
    expect(version.featureSlug).toBe("checkout-flow");
    expect(version.fileBaseName).toBe("2026-07-09-refactor");
    expect(version.frontmatter.goals).toEqual(["reduce-churn"]);
    expect(version.frontmatter.metrics).toEqual([
      { metric: "d7-retention", target: "25%", baseline: "20%" },
    ]);
  });

  it("errors when frontmatter's feature slug does not match its directory", () => {
    expect(() =>
      parseFeatureVersion("prds/wrong-dir/2026-07-09-refactor.md", validFeatureRaw),
    ).toThrowError(IndexError);
  });

  it("errors on malformed date", () => {
    const raw = validFeatureRaw.replace('date: "2026-07-09"', "date: not-a-date");
    expect(() => parseFeatureVersion("prds/checkout-flow/x.md", raw)).toThrowError(IndexError);
  });

  it("errors on invalid status", () => {
    const raw = validFeatureRaw.replace("status: active", "status: not-a-real-status");
    expect(() => parseFeatureVersion("prds/checkout-flow/x.md", raw)).toThrowError(IndexError);
  });

  it("defaults optional array fields to empty arrays when omitted", () => {
    const raw = `---
feature: checkout-flow
title: Checkout Flow
date: "2026-07-09"
status: draft
---
`;
    const version = parseFeatureVersion("prds/checkout-flow/x.md", raw);
    expect(version.frontmatter.goals).toEqual([]);
    expect(version.frontmatter.metrics).toEqual([]);
    expect(version.frontmatter.related_features).toEqual([]);
    expect(version.frontmatter.depends_on).toEqual([]);
  });
});

describe("parseGoalRegistry", () => {
  it("parses a valid goal registry file", () => {
    const raw = `---
goal: reduce-churn
title: Reduce churn
description: Keep users around longer.
---
`;
    const goal = parseGoalRegistry("goals/reduce-churn.md", raw);
    expect(goal.slug).toBe("reduce-churn");
    expect(goal.frontmatter.title).toBe("Reduce churn");
  });

  it("errors when the goal slug does not match its filename", () => {
    const raw = `---
goal: something-else
title: Reduce churn
---
`;
    expect(() => parseGoalRegistry("goals/reduce-churn.md", raw)).toThrowError(IndexError);
  });
});

describe("parseMetricRegistry", () => {
  it("parses a valid metric registry file", () => {
    const raw = `---
metric: d7-retention
title: Day-7 retention
unit: percent
---
`;
    const metric = parseMetricRegistry("metrics/d7-retention.md", raw);
    expect(metric.slug).toBe("d7-retention");
    expect(metric.frontmatter.unit).toBe("percent");
  });

  it("errors when the metric slug does not match its filename", () => {
    const raw = `---
metric: something-else
title: Day-7 retention
---
`;
    expect(() => parseMetricRegistry("metrics/d7-retention.md", raw)).toThrowError(IndexError);
  });
});
