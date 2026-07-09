import type { GraphNode } from "../../db/types.js";

export interface NodeSummary {
  id: string;
  type: GraphNode["type"];
  key: string;
  title: string | null;
}

export function summarizeNode(node: GraphNode | undefined): NodeSummary | null {
  if (!node) return null;
  return { id: node.id, type: node.type, key: node.key, title: node.title };
}

/** The three node types addressable by slug through the MCP tool surface. */
export type AddressableType = "Feature" | "Goal" | "Metric";
