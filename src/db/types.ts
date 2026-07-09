export type NodeType = "Product" | "Feature" | "PRDVersion" | "Goal" | "Metric";

export type EdgeType =
  | "HAS_VERSION"
  | "SUPERSEDES"
  | "SERVES"
  | "TARGETS"
  | "RELATES_TO"
  | "DEPENDS_ON";

export interface GraphNode<P = Record<string, unknown>> {
  id: string;
  type: NodeType;
  key: string;
  title: string | null;
  properties: P;
  sourceFile: string | null;
}

export interface GraphEdge<P = Record<string, unknown>> {
  id: string;
  fromId: string;
  toId: string;
  type: EdgeType;
  properties: P;
}
