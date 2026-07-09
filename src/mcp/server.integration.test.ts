import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createProductgraphMcpServer } from "./server.js";
import { buildFixtureAccess } from "./tools/fixture.js";

function parseJsonContent(result: { content: Array<{ type: string; text?: string }> }): unknown {
  const [first] = result.content;
  if (!first || first.type !== "text" || first.text === undefined) {
    throw new Error("expected a single text content block");
  }
  return JSON.parse(first.text);
}

describe("productgraph MCP server (real protocol round-trip)", () => {
  let client: Client;

  beforeEach(async () => {
    const { access } = buildFixtureAccess();
    const server = createProductgraphMcpServer(access);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client({ name: "test-client", version: "0.0.0" });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  });

  afterEach(async () => {
    await client.close();
  });

  it("lists all five tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "productgraph_explore",
      "productgraph_history",
      "productgraph_impact",
      "productgraph_node",
      "productgraph_search",
    ]);
  });

  it("productgraph_search finds a known feature", async () => {
    const result = await client.callTool({ name: "productgraph_search", arguments: { query: "checkout" } });
    const parsed = parseJsonContent(result as any) as Array<{ key: string }>;
    expect(parsed.map((r) => r.key)).toEqual(["checkout-flow"]);
  });

  it("productgraph_node returns edges for a known feature", async () => {
    const result = await client.callTool({
      name: "productgraph_node",
      arguments: { type: "Feature", key: "checkout-flow" },
    });
    const parsed = parseJsonContent(result as any) as { found: boolean; edges: unknown[] };
    expect(parsed.found).toBe(true);
    expect(parsed.edges.length).toBeGreaterThan(0);
  });

  it("productgraph_explore returns goals/metrics for a feature", async () => {
    const result = await client.callTool({
      name: "productgraph_explore",
      arguments: { type: "Feature", key: "checkout-flow" },
    });
    const parsed = parseJsonContent(result as any) as { goals: Array<{ key: string }> };
    expect(parsed.goals.map((g) => g.key)).toEqual(["reduce-churn"]);
  });

  it("productgraph_history returns a chronological, diffed timeline", async () => {
    const result = await client.callTool({
      name: "productgraph_history",
      arguments: { feature: "checkout-flow" },
    });
    const parsed = parseJsonContent(result as any) as { versions: Array<{ key: string }> };
    expect(parsed.versions.map((v) => v.key)).toEqual([
      "checkout-flow/2026-03-01-initial",
      "checkout-flow/2026-07-09-refactor",
    ]);
  });

  it("productgraph_impact returns dependent features", async () => {
    const result = await client.callTool({
      name: "productgraph_impact",
      arguments: { type: "Feature", key: "checkout-flow" },
    });
    const parsed = parseJsonContent(result as any) as { dependentFeatures: Array<{ key: string }> };
    expect(parsed.dependentFeatures.map((f) => f.key)).toEqual(["paypal-support"]);
  });

  it("returns a not-found result rather than a protocol error for an unknown key", async () => {
    const result = await client.callTool({
      name: "productgraph_explore",
      arguments: { type: "Feature", key: "does-not-exist" },
    });
    const parsed = parseJsonContent(result as any) as { found: boolean };
    expect(parsed.found).toBe(false);
  });
});
