import { existsSync } from "node:fs";
import { productgraphDbPath } from "../index/indexer.js";
import { serveMcpOverStdio } from "../mcp/server.js";

export async function runServe(root: string, options: { mcp?: boolean }): Promise<void> {
  if (!options.mcp) {
    console.error("productgraph serve currently only supports --mcp (stdio MCP server).");
    process.exitCode = 1;
    return;
  }

  if (!existsSync(productgraphDbPath(root))) {
    console.error("No productgraph.db found — run `productgraph index` first.");
    process.exitCode = 1;
    return;
  }

  await serveMcpOverStdio(root);
}
