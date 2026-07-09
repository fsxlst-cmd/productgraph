import { existsSync } from "node:fs";
import { GraphAccess } from "../db/access.js";
import { openReadOnlyDb } from "../db/schema.js";
import { productgraphDbPath, readLastIndexSidecar } from "../index/indexer.js";

export interface StatusResult {
  indexedAt: string | undefined;
  counts: { nodes: Record<string, number>; edges: Record<string, number> };
  warnings: string[];
}

export async function runStatus(root: string): Promise<StatusResult | undefined> {
  const dbPath = productgraphDbPath(root);
  if (!existsSync(dbPath)) {
    console.log("No productgraph.db found — run `productgraph index` first.");
    process.exitCode = 1;
    return undefined;
  }

  const db = openReadOnlyDb(dbPath);
  let counts: StatusResult["counts"];
  try {
    counts = new GraphAccess(db).countsByType();
  } finally {
    db.close();
  }

  const sidecar = readLastIndexSidecar(root);
  const result: StatusResult = {
    indexedAt: sidecar?.indexedAt,
    counts,
    warnings: sidecar?.warnings ?? [],
  };

  console.log(`Last indexed: ${result.indexedAt ?? "unknown"}`);
  console.log("Nodes:");
  for (const [type, count] of Object.entries(result.counts.nodes)) {
    console.log(`  ${type}: ${count}`);
  }
  console.log("Edges:");
  for (const [type, count] of Object.entries(result.counts.edges)) {
    console.log(`  ${type}: ${count}`);
  }
  if (result.warnings.length > 0) {
    console.log("Warnings:");
    for (const warning of result.warnings) {
      console.log(`  - ${warning}`);
    }
  }

  return result;
}
