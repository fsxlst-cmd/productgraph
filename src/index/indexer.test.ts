import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { GraphAccess } from "../db/access.js";
import { openReadOnlyDb } from "../db/schema.js";
import { IndexValidationError } from "./errors.js";
import { productgraphDbPath, readLastIndexSidecar, runFullIndex } from "./indexer.js";
import { cleanupTempProjectDir, makeTempProjectDir, writeFixtureFile } from "./test-helpers.js";

function writeBasicFixture(root: string): void {
  writeFixtureFile(
    root,
    "goals/reduce-churn.md",
    "---\ngoal: reduce-churn\ntitle: Reduce churn\n---\n",
  );
  writeFixtureFile(
    root,
    "metrics/d7-retention.md",
    "---\nmetric: d7-retention\ntitle: Day-7 retention\n---\n",
  );
  writeFixtureFile(
    root,
    "prds/checkout-flow/2026-07-09-refactor.md",
    `---
feature: checkout-flow
title: Checkout Flow
date: "2026-07-09"
status: active
goals: [reduce-churn]
metrics:
  - metric: d7-retention
---
`,
  );
}

describe("runFullIndex", () => {
  let root: string;

  afterEach(() => {
    if (root) cleanupTempProjectDir(root);
  });

  it("builds a committed db with the expected node/edge counts", () => {
    root = makeTempProjectDir();
    writeBasicFixture(root);

    const result = runFullIndex(root);

    expect(result.counts.nodes).toEqual({ Feature: 1, Goal: 1, Metric: 1, PRDVersion: 1 });
    expect(result.counts.edges).toEqual({ HAS_VERSION: 1, SERVES: 1, TARGETS: 1 });
    expect(existsSync(productgraphDbPath(root))).toBe(true);
    expect(existsSync(path.join(root, ".productgraph", "productgraph.db.tmp"))).toBe(false);
  });

  it("writes the last-index sidecar with a timestamp", () => {
    root = makeTempProjectDir();
    writeBasicFixture(root);

    runFullIndex(root, () => new Date("2026-07-09T00:00:00.000Z"));

    const sidecar = readLastIndexSidecar(root);
    expect(sidecar?.indexedAt).toBe("2026-07-09T00:00:00.000Z");
  });

  it("re-indexing unchanged files produces a byte-identical productgraph.db", () => {
    root = makeTempProjectDir();
    writeBasicFixture(root);

    runFullIndex(root, () => new Date("2026-07-09T00:00:00.000Z"));
    const first = readFileSync(productgraphDbPath(root));

    runFullIndex(root, () => new Date("2026-07-10T00:00:00.000Z"));
    const second = readFileSync(productgraphDbPath(root));

    expect(second.equals(first)).toBe(true);
  });

  it("produces the same node/edge ids across independent runs", () => {
    root = makeTempProjectDir();
    writeBasicFixture(root);
    runFullIndex(root);

    const db = openReadOnlyDb(productgraphDbPath(root));
    const access = new GraphAccess(db);
    const feature = access.getFeature("checkout-flow");
    db.close();

    expect(feature?.id).toBe("feature:checkout-flow");
  });

  it("fails with an aggregate error and does not touch the committed db when a reference is unresolved", () => {
    root = makeTempProjectDir();
    writeFixtureFile(
      root,
      "prds/checkout-flow/2026-07-09-refactor.md",
      `---
feature: checkout-flow
title: Checkout Flow
date: "2026-07-09"
status: active
goals: [reduce-churn]
---
`,
    );

    expect(() => runFullIndex(root)).toThrowError(IndexValidationError);
    expect(existsSync(productgraphDbPath(root))).toBe(false);
  });

  it("leaves a previously-committed db untouched if a later index run fails validation", () => {
    root = makeTempProjectDir();
    writeBasicFixture(root);
    runFullIndex(root);
    const before = readFileSync(productgraphDbPath(root));

    // Introduce a broken reference in a second feature without removing the first.
    writeFixtureFile(
      root,
      "prds/broken-feature/2026-07-09-x.md",
      `---
feature: broken-feature
title: Broken
date: "2026-07-09"
status: active
related_features: [does-not-exist]
---
`,
    );

    expect(() => runFullIndex(root)).toThrowError(IndexValidationError);

    const after = readFileSync(productgraphDbPath(root));
    expect(after.equals(before)).toBe(true);
  });

  it("aggregates multiple validation errors from different files into one error", () => {
    root = makeTempProjectDir();
    writeFixtureFile(
      root,
      "prds/feature-a/2026-01-01-x.md",
      `---
feature: feature-a
title: A
date: "2026-01-01"
status: active
goals: [unknown-goal]
---
`,
    );
    writeFixtureFile(
      root,
      "prds/feature-b/2026-01-01-x.md",
      `---
feature: feature-b
title: B
date: "2026-01-01"
status: active
depends_on: [unknown-feature]
---
`,
    );

    try {
      runFullIndex(root);
      expect.unreachable("expected runFullIndex to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(IndexValidationError);
      const validationError = err as IndexValidationError;
      expect(validationError.errors).toHaveLength(2);
    }
  });
});
