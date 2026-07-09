import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { GraphAccess } from "../db/access.js";
import { openReadOnlyDb } from "../db/schema.js";
import { productgraphDbPath } from "../index/indexer.js";
import { exploreTool } from "./tools/explore.js";
import { historyTool } from "./tools/history.js";
import { impactTool } from "./tools/impact.js";
import { nodeTool } from "./tools/node.js";
import { searchTool } from "./tools/search.js";

const ADDRESSABLE_TYPE = z.enum(["Feature", "Goal", "Metric"]);
const ANY_NODE_TYPE = z.enum(["Product", "Feature", "PRDVersion", "Goal", "Metric"]);

function jsonResult(value: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }] };
}

/** Registers all read-only productgraph query tools against an already-open GraphAccess. */
export function createProductgraphMcpServer(access: GraphAccess): McpServer {
  const server = new McpServer({ name: "productgraph", version: "0.1.0" });

  server.registerTool(
    "productgraph_search",
    {
      description: "Keyword search across features, goals, and metrics by key or title.",
      inputSchema: { query: z.string().min(1), types: z.array(ADDRESSABLE_TYPE).optional() },
    },
    async ({ query, types }) => jsonResult(searchTool(access, { query, types })),
  );

  server.registerTool(
    "productgraph_node",
    {
      description: "One node's full properties and every incoming/outgoing edge, regardless of edge type.",
      inputSchema: { type: ANY_NODE_TYPE, key: z.string().min(1) },
    },
    async ({ type, key }) => jsonResult(nodeTool(access, { type, key })),
  );

  server.registerTool(
    "productgraph_explore",
    {
      description:
        "Full neighborhood context around a feature (goals served, metrics targeted, related/dependent " +
        "features, recent history) or around a goal/metric (which features serve/target it).",
      inputSchema: { type: ADDRESSABLE_TYPE, key: z.string().min(1) },
    },
    async ({ type, key }) => jsonResult(exploreTool(access, { type, key })),
  );

  server.registerTool(
    "productgraph_history",
    {
      description:
        "Timeline of PRD versions for a feature, ordered by date, each annotated with a field-level diff " +
        "against the previous version.",
      inputSchema: { feature: z.string().min(1) },
    },
    async ({ feature }) => jsonResult(historyTool(access, { feature })),
  );

  server.registerTool(
    "productgraph_impact",
    {
      description:
        "What would be affected by changing this feature, goal, or metric: dependent/related features, " +
        "or (for a goal/metric) every feature that serves/targets it.",
      inputSchema: { type: ADDRESSABLE_TYPE, key: z.string().min(1) },
    },
    async ({ type, key }) => jsonResult(impactTool(access, { type, key })),
  );

  return server;
}

/** Opens the committed graph read-only and serves the MCP tools over stdio. */
export async function serveMcpOverStdio(root: string): Promise<void> {
  const db = openReadOnlyDb(productgraphDbPath(root));
  const access = new GraphAccess(db);
  const server = createProductgraphMcpServer(access);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
