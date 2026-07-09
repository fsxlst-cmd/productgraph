import { describe, expect, it } from "vitest";
import { buildFixtureAccess } from "./fixture.js";
import { nodeTool } from "./node.js";

describe("nodeTool", () => {
  it("returns full properties and every incoming/outgoing edge for a known node", () => {
    const { access } = buildFixtureAccess();
    const result = nodeTool(access, { type: "Feature", key: "checkout-flow" });

    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.node.key).toBe("checkout-flow");
    const edgeTypes = result.edges.map((e) => `${e.direction}:${e.type}`).sort();
    expect(edgeTypes).toContain("outgoing:SERVES");
    expect(edgeTypes).toContain("outgoing:TARGETS");
    expect(edgeTypes).toContain("outgoing:RELATES_TO");
    expect(edgeTypes).toContain("outgoing:HAS_VERSION");
    expect(edgeTypes).toContain("incoming:DEPENDS_ON");
  });

  it("returns found: false for an unknown key rather than throwing", () => {
    const { access } = buildFixtureAccess();
    const result = nodeTool(access, { type: "Feature", key: "does-not-exist" });
    expect(result).toEqual({ found: false });
  });
});
