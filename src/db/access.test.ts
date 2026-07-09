import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { GraphAccess } from "./access.js";
import { edgeId, nodeId } from "./ids.js";
import { openWritableDb } from "./schema.js";

describe("GraphAccess", () => {
  let db: Database.Database;
  let access: GraphAccess;

  beforeEach(() => {
    db = openWritableDb(":memory:");
    access = new GraphAccess(db);

    access.insertNode({
      id: nodeId("Feature", "checkout-flow"),
      type: "Feature",
      key: "checkout-flow",
      title: "Checkout Flow",
      properties: { status: "active" },
      sourceFile: "prds/checkout-flow/2026-07-09-refactor.md",
    });
    access.insertNode({
      id: nodeId("Feature", "paypal-support"),
      type: "Feature",
      key: "paypal-support",
      title: "PayPal Support",
      properties: { status: "active" },
    });
    access.insertNode({
      id: nodeId("Goal", "reduce-churn"),
      type: "Goal",
      key: "reduce-churn",
      title: "Reduce churn",
      properties: {},
    });
    access.insertEdge({
      id: edgeId("SERVES", nodeId("Feature", "checkout-flow"), nodeId("Goal", "reduce-churn")),
      fromId: nodeId("Feature", "checkout-flow"),
      toId: nodeId("Goal", "reduce-churn"),
      type: "SERVES",
    });
    access.insertEdge({
      id: edgeId("RELATES_TO", nodeId("Feature", "checkout-flow"), nodeId("Feature", "paypal-support")),
      fromId: nodeId("Feature", "checkout-flow"),
      toId: nodeId("Feature", "paypal-support"),
      type: "RELATES_TO",
    });
  });

  it("gets a node by id", () => {
    const node = access.getNodeById(nodeId("Feature", "checkout-flow"));
    expect(node?.title).toBe("Checkout Flow");
    expect(node?.properties).toEqual({ status: "active" });
  });

  it("gets a feature/goal/metric by slug via typed helpers", () => {
    expect(access.getFeature("checkout-flow")?.key).toBe("checkout-flow");
    expect(access.getGoal("reduce-churn")?.key).toBe("reduce-churn");
    expect(access.getMetric("does-not-exist")).toBeUndefined();
  });

  it("lists nodes by type in key order", () => {
    const features = access.listNodesByType("Feature");
    expect(features.map((f) => f.key)).toEqual(["checkout-flow", "paypal-support"]);
  });

  it("searches nodes case-insensitively across key and title", () => {
    const results = access.searchNodes("checkout");
    expect(results).toHaveLength(1);
    expect(results[0]?.key).toBe("checkout-flow");
  });

  it("searches with no matches returns an empty array, not an error", () => {
    expect(access.searchNodes("nonexistent-term")).toEqual([]);
  });

  it("filters search by node type", () => {
    const results = access.searchNodes("reduce", ["Goal"]);
    expect(results).toHaveLength(1);
    expect(results[0]?.type).toBe("Goal");
  });

  it("gets outgoing and incoming edges", () => {
    const outgoing = access.getOutgoingEdges(nodeId("Feature", "checkout-flow"));
    expect(outgoing).toHaveLength(2);

    const incoming = access.getIncomingEdges(nodeId("Feature", "paypal-support"));
    expect(incoming).toHaveLength(1);
    expect(incoming[0]?.type).toBe("RELATES_TO");
  });

  it("filters edges by type", () => {
    const served = access.getOutgoingEdges(nodeId("Feature", "checkout-flow"), "SERVES");
    expect(served).toHaveLength(1);
    expect(served[0]?.toId).toBe(nodeId("Goal", "reduce-churn"));
  });

  it("counts nodes and edges by type", () => {
    const counts = access.countsByType();
    expect(counts.nodes).toEqual({ Feature: 2, Goal: 1 });
    expect(counts.edges).toEqual({ SERVES: 1, RELATES_TO: 1 });
  });
});
