import { describe, expect, it } from "vitest";
import { GraphAccess } from "../../db/access.js";
import { buildFixtureAccess } from "./fixture.js";
import { searchTool } from "./search.js";

describe("searchTool", () => {
  let access: GraphAccess;

  it("finds a feature by a partial title match", () => {
    ({ access } = buildFixtureAccess());
    const results = searchTool(access, { query: "checkout" });
    expect(results.map((r) => r.key)).toEqual(["checkout-flow"]);
  });

  it("returns an empty array, not an error, when nothing matches", () => {
    ({ access } = buildFixtureAccess());
    expect(searchTool(access, { query: "nonexistent-xyz" })).toEqual([]);
  });

  it("filters by node type", () => {
    ({ access } = buildFixtureAccess());
    const results = searchTool(access, { query: "reduce", types: ["Goal"] });
    expect(results).toHaveLength(1);
    expect(results[0]?.type).toBe("Goal");
  });
});
