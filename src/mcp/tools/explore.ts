import type { GraphAccess } from "../../db/access.js";
import type { GraphNode } from "../../db/types.js";
import { summarizeNode, type AddressableType, type NodeSummary } from "./shared.js";

export interface ExploreArgs {
  type: AddressableType;
  key: string;
}

interface MetricTarget extends NodeSummary {
  target: unknown;
  baseline: unknown;
}

interface RecentHistoryEntry {
  key: string;
  date: unknown;
  title: string | null;
}

export type ExploreResult =
  | { found: false }
  | {
      found: true;
      feature: NodeSummary;
      status: unknown;
      goals: NodeSummary[];
      metrics: MetricTarget[];
      relatedFeatures: NodeSummary[];
      dependsOn: NodeSummary[];
      recentHistory: RecentHistoryEntry[];
    }
  | { found: true; node: NodeSummary; features: NodeSummary[] };

function sortedVersions(access: GraphAccess, featureId: string): GraphNode[] {
  return access
    .getOutgoingEdges(featureId, "HAS_VERSION")
    .map((edge) => access.getNodeById(edge.toId))
    .filter((node): node is GraphNode => node !== undefined)
    .sort((a, b) => String(a.properties.date).localeCompare(String(b.properties.date)));
}

export function exploreTool(access: GraphAccess, args: ExploreArgs): ExploreResult {
  const node = access.getNodeByTypeAndKey(args.type, args.key);
  if (!node) return { found: false };

  if (args.type === "Feature") {
    const goals = access
      .getOutgoingEdges(node.id, "SERVES")
      .map((edge) => summarizeNode(access.getNodeById(edge.toId)))
      .filter((n): n is NodeSummary => n !== null);

    const metrics: MetricTarget[] = [];
    for (const edge of access.getOutgoingEdges(node.id, "TARGETS")) {
      const summary = summarizeNode(access.getNodeById(edge.toId));
      if (!summary) continue;
      const target: unknown = edge.properties.target ?? null;
      const baseline: unknown = edge.properties.baseline ?? null;
      metrics.push({ ...summary, target, baseline });
    }

    const relatedFeatures = access
      .getOutgoingEdges(node.id, "RELATES_TO")
      .map((edge) => summarizeNode(access.getNodeById(edge.toId)))
      .filter((n): n is NodeSummary => n !== null);

    const dependsOn = access
      .getOutgoingEdges(node.id, "DEPENDS_ON")
      .map((edge) => summarizeNode(access.getNodeById(edge.toId)))
      .filter((n): n is NodeSummary => n !== null);

    const recentHistory = sortedVersions(access, node.id)
      .slice(-3)
      .reverse()
      .map((version) => ({ key: version.key, date: version.properties.date, title: version.title }));

    return {
      found: true,
      feature: { id: node.id, type: node.type, key: node.key, title: node.title },
      status: node.properties.status,
      goals,
      metrics,
      relatedFeatures,
      dependsOn,
      recentHistory,
    };
  }

  const edgeType = args.type === "Goal" ? "SERVES" : "TARGETS";
  const features = access
    .getIncomingEdges(node.id, edgeType)
    .map((edge) => summarizeNode(access.getNodeById(edge.fromId)))
    .filter((n): n is NodeSummary => n !== null);

  return { found: true, node: { id: node.id, type: node.type, key: node.key, title: node.title }, features };
}
