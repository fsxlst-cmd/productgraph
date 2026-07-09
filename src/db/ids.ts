import type { EdgeType, NodeType } from "./types.js";

const TYPE_PREFIX: Record<NodeType, string> = {
  Product: "product",
  Feature: "feature",
  PRDVersion: "prdversion",
  Goal: "goal",
  Metric: "metric",
};

/**
 * Deterministic node id: same (type, key) always produces the same id,
 * across runs and across machines, so full rebuilds are byte-identical.
 */
export function nodeId(type: NodeType, key: string): string {
  return `${TYPE_PREFIX[type]}:${key}`;
}

/** PRDVersion key is the file's path relative to prds/, minus extension. */
export function prdVersionKey(featureSlug: string, fileBaseName: string): string {
  return `${featureSlug}/${fileBaseName}`;
}

/** Deterministic edge id: same (type, from, to) always produces the same id. */
export function edgeId(type: EdgeType, fromId: string, toId: string): string {
  return `${type}::${fromId}->${toId}`;
}
