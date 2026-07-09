import { describe, expect, it } from "vitest";
import { edgeId, nodeId, prdVersionKey } from "./ids.js";

describe("nodeId", () => {
  it("is deterministic for the same type and key", () => {
    expect(nodeId("Feature", "checkout-flow")).toBe(nodeId("Feature", "checkout-flow"));
  });

  it("namespaces by type so different node types never collide", () => {
    expect(nodeId("Feature", "checkout-flow")).not.toBe(nodeId("Goal", "checkout-flow"));
  });
});

describe("prdVersionKey", () => {
  it("joins the feature slug and file base name", () => {
    expect(prdVersionKey("checkout-flow", "2026-07-09-refactor")).toBe(
      "checkout-flow/2026-07-09-refactor",
    );
  });
});

describe("edgeId", () => {
  it("is deterministic for the same type, from, and to", () => {
    const a = edgeId("RELATES_TO", "feature:checkout-flow", "feature:paypal");
    const b = edgeId("RELATES_TO", "feature:checkout-flow", "feature:paypal");
    expect(a).toBe(b);
  });

  it("distinguishes direction", () => {
    const forward = edgeId("RELATES_TO", "feature:checkout-flow", "feature:paypal");
    const backward = edgeId("RELATES_TO", "feature:paypal", "feature:checkout-flow");
    expect(forward).not.toBe(backward);
  });

  it("distinguishes edge type between the same two nodes", () => {
    const a = edgeId("RELATES_TO", "feature:checkout-flow", "feature:paypal");
    const b = edgeId("DEPENDS_ON", "feature:checkout-flow", "feature:paypal");
    expect(a).not.toBe(b);
  });
});
