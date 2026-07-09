import type { GraphAccess } from "../../db/access.js";
import { summarizeNode, type AddressableType, type NodeSummary } from "./shared.js";

export interface ImpactArgs {
  type: AddressableType;
  key: string;
}

export type ImpactResult =
  | { found: false }
  | { found: true; node: NodeSummary; relatedFeatures: NodeSummary[]; dependentFeatures: NodeSummary[] }
  | { found: true; node: NodeSummary; features: NodeSummary[] };

export function impactTool(access: GraphAccess, args: ImpactArgs): ImpactResult {
  const node = access.getNodeByTypeAndKey(args.type, args.key);
  if (!node) return { found: false };

  const nodeSummary = summarizeNode(node) as NodeSummary;

  if (args.type === "Feature") {
    const relatedFeatures = access
      .getIncomingEdges(node.id, "RELATES_TO")
      .map((edge) => summarizeNode(access.getNodeById(edge.fromId)))
      .filter((n): n is NodeSummary => n !== null);

    const dependentFeatures = access
      .getIncomingEdges(node.id, "DEPENDS_ON")
      .map((edge) => summarizeNode(access.getNodeById(edge.fromId)))
      .filter((n): n is NodeSummary => n !== null);

    return { found: true, node: nodeSummary, relatedFeatures, dependentFeatures };
  }

  const edgeType = args.type === "Goal" ? "SERVES" : "TARGETS";
  const features = access
    .getIncomingEdges(node.id, edgeType)
    .map((edge) => summarizeNode(access.getNodeById(edge.fromId)))
    .filter((n): n is NodeSummary => n !== null);

  return { found: true, node: nodeSummary, features };
}
