import type { GraphAccess } from "../../db/access.js";
import type { GraphNode } from "../../db/types.js";
import { summarizeNode, type NodeSummary } from "./shared.js";

export interface HistoryArgs {
  feature: string;
}

const DIFFED_FIELDS = ["status", "goals", "metrics", "related_features", "depends_on"] as const;

export interface FieldChange {
  from: unknown;
  to: unknown;
}

export interface HistoryEntry {
  key: string;
  date: unknown;
  title: string | null;
  status: unknown;
  changedFromPrevious: Record<string, FieldChange> | null;
}

export type HistoryResult = { found: false } | { found: true; feature: NodeSummary; versions: HistoryEntry[] };

function diffProperties(
  previous: Record<string, unknown>,
  current: Record<string, unknown>,
): Record<string, FieldChange> {
  const changes: Record<string, FieldChange> = {};
  for (const field of DIFFED_FIELDS) {
    if (JSON.stringify(previous[field]) !== JSON.stringify(current[field])) {
      changes[field] = { from: previous[field], to: current[field] };
    }
  }
  return changes;
}

export function historyTool(access: GraphAccess, args: HistoryArgs): HistoryResult {
  const feature = access.getFeature(args.feature);
  if (!feature) return { found: false };

  const versions = access
    .getOutgoingEdges(feature.id, "HAS_VERSION")
    .map((edge) => access.getNodeById(edge.toId))
    .filter((node): node is GraphNode => node !== undefined)
    .sort((a, b) => String(a.properties.date).localeCompare(String(b.properties.date)));

  const entries: HistoryEntry[] = versions.map((version, index) => {
    const previous = versions[index - 1];
    return {
      key: version.key,
      date: version.properties.date,
      title: version.title,
      status: version.properties.status,
      changedFromPrevious: previous ? diffProperties(previous.properties, version.properties) : null,
    };
  });

  return { found: true, feature: summarizeNode(feature) as NodeSummary, versions: entries };
}
