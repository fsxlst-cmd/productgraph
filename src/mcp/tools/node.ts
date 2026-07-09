import type { GraphAccess } from "../../db/access.js";
import type { NodeType } from "../../db/types.js";
import { summarizeNode, type NodeSummary } from "./shared.js";

export interface NodeArgs {
  type: NodeType;
  key: string;
}

export interface NodeEdgeSummary {
  direction: "outgoing" | "incoming";
  type: string;
  properties: Record<string, unknown>;
  other: NodeSummary | null;
}

export type NodeToolResult =
  | { found: false }
  | {
      found: true;
      node: { id: string; type: NodeType; key: string; title: string | null; properties: Record<string, unknown> };
      edges: NodeEdgeSummary[];
    };

export function nodeTool(access: GraphAccess, args: NodeArgs): NodeToolResult {
  const node = access.getNodeByTypeAndKey(args.type, args.key);
  if (!node) return { found: false };

  const outgoing: NodeEdgeSummary[] = access.getOutgoingEdges(node.id).map((edge) => ({
    direction: "outgoing",
    type: edge.type,
    properties: edge.properties,
    other: summarizeNode(access.getNodeById(edge.toId)),
  }));

  const incoming: NodeEdgeSummary[] = access.getIncomingEdges(node.id).map((edge) => ({
    direction: "incoming",
    type: edge.type,
    properties: edge.properties,
    other: summarizeNode(access.getNodeById(edge.fromId)),
  }));

  return {
    found: true,
    node: { id: node.id, type: node.type, key: node.key, title: node.title, properties: node.properties },
    edges: [...outgoing, ...incoming],
  };
}
