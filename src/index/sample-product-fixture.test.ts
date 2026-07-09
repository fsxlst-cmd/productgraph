import { afterEach, describe, expect, it } from "vitest";
import { GraphAccess } from "../db/access.js";
import { openReadOnlyDb } from "../db/schema.js";
import { productgraphDbPath, runFullIndex } from "./indexer.js";
import { cleanupTempProjectDir, copySampleProductFixture } from "./test-helpers.js";

describe("indexing the shared sample-product fixture", () => {
  let root: string;

  afterEach(() => {
    if (root) cleanupTempProjectDir(root);
  });

  it("indexes cleanly with the expected node/edge counts", () => {
    root = copySampleProductFixture();

    const result = runFullIndex(root);

    expect(result.counts.nodes).toEqual({
      Feature: 5,
      Goal: 2,
      Metric: 2,
      PRDVersion: 6,
    });
    expect(result.counts.edges.HAS_VERSION).toBe(6);
    expect(result.counts.edges.SUPERSEDES).toBe(1);
    expect(result.counts.edges.DEPENDS_ON).toBe(2);
    expect(result.counts.edges.RELATES_TO).toBe(2);
  });

  it("resolves the shared goal and metric across task-creation and reporting-dashboard", () => {
    root = copySampleProductFixture();
    runFullIndex(root);

    const db = openReadOnlyDb(productgraphDbPath(root));
    const access = new GraphAccess(db);

    const goal = access.getGoal("increase-engagement");
    const servingFeatures = access.getIncomingEdges(goal!.id, "SERVES").map((e) => e.fromId);
    expect(servingFeatures.sort()).toEqual(["feature:reporting-dashboard", "feature:task-creation"]);

    const metric = access.getMetric("task-completion-rate");
    const targetingFeatures = access.getIncomingEdges(metric!.id, "TARGETS").map((e) => e.fromId);
    expect(targetingFeatures.sort()).toEqual(["feature:reporting-dashboard", "feature:task-creation"]);

    db.close();
  });

  it("chains task-creation's two versions via SUPERSEDES", () => {
    root = copySampleProductFixture();
    runFullIndex(root);

    const db = openReadOnlyDb(productgraphDbPath(root));
    const access = new GraphAccess(db);

    const newer = access.getNodeByTypeAndKey("PRDVersion", "task-creation/2026-05-01-refactor");
    const supersedes = access.getOutgoingEdges(newer!.id, "SUPERSEDES");
    expect(supersedes).toHaveLength(1);
    expect(supersedes[0]?.toId).toBe("prdversion:task-creation/2026-01-15-initial");

    db.close();
  });
});
