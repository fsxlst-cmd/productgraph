import type { GraphAccess } from "../../db/access.js";
import { summarizeNode, type AddressableType, type NodeSummary } from "./shared.js";

const SEARCHABLE_TYPES: AddressableType[] = ["Feature", "Goal", "Metric"];

export interface SearchArgs {
  query: string;
  types?: AddressableType[];
}

/** Searches only Feature/Goal/Metric nodes — PRDVersion and Product are not directly searchable. */
export function searchTool(access: GraphAccess, args: SearchArgs): NodeSummary[] {
  return access
    .searchNodes(args.query, args.types ?? SEARCHABLE_TYPES)
    .map((node) => summarizeNode(node))
    .filter((n): n is NodeSummary => n !== null);
}
