import type Database from "better-sqlite3";
import type { EdgeType, GraphEdge, GraphNode, NodeType } from "./types.js";

interface NodeRow {
  id: string;
  type: string;
  key: string;
  title: string | null;
  properties: string;
  source_file: string | null;
}

interface EdgeRow {
  id: string;
  from_id: string;
  to_id: string;
  type: string;
  properties: string;
}

function rowToNode(row: NodeRow): GraphNode {
  return {
    id: row.id,
    type: row.type as NodeType,
    key: row.key,
    title: row.title,
    properties: JSON.parse(row.properties),
    sourceFile: row.source_file,
  };
}

function rowToEdge(row: EdgeRow): GraphEdge {
  return {
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
    type: row.type as EdgeType,
    properties: JSON.parse(row.properties),
  };
}

export interface NewNode {
  id: string;
  type: NodeType;
  key: string;
  title?: string | null;
  properties: Record<string, unknown>;
  sourceFile?: string | null;
}

export interface NewEdge {
  id: string;
  fromId: string;
  toId: string;
  type: EdgeType;
  properties?: Record<string, unknown>;
}

/**
 * Single point of contact between raw SQL/JSON and the rest of the codebase.
 * Read methods are safe to call against a readonly connection; insert
 * methods are only ever invoked by the indexer against a writable one.
 */
export class GraphAccess {
  constructor(private readonly db: Database.Database) {}

  insertNode(node: NewNode): void {
    this.db
      .prepare(
        `INSERT INTO nodes (id, type, key, title, properties, source_file)
         VALUES (@id, @type, @key, @title, @properties, @sourceFile)`,
      )
      .run({
        id: node.id,
        type: node.type,
        key: node.key,
        title: node.title ?? null,
        properties: JSON.stringify(node.properties),
        sourceFile: node.sourceFile ?? null,
      });
  }

  insertEdge(edge: NewEdge): void {
    this.db
      .prepare(
        `INSERT INTO edges (id, from_id, to_id, type, properties)
         VALUES (@id, @fromId, @toId, @type, @properties)`,
      )
      .run({
        id: edge.id,
        fromId: edge.fromId,
        toId: edge.toId,
        type: edge.type,
        properties: JSON.stringify(edge.properties ?? {}),
      });
  }

  getNodeById(id: string): GraphNode | undefined {
    const row = this.db.prepare("SELECT * FROM nodes WHERE id = ?").get(id) as NodeRow | undefined;
    return row ? rowToNode(row) : undefined;
  }

  getNodeByTypeAndKey(type: NodeType, key: string): GraphNode | undefined {
    const row = this.db
      .prepare("SELECT * FROM nodes WHERE type = ? AND key = ?")
      .get(type, key) as NodeRow | undefined;
    return row ? rowToNode(row) : undefined;
  }

  getFeature(slug: string): GraphNode | undefined {
    return this.getNodeByTypeAndKey("Feature", slug);
  }

  getGoal(slug: string): GraphNode | undefined {
    return this.getNodeByTypeAndKey("Goal", slug);
  }

  getMetric(slug: string): GraphNode | undefined {
    return this.getNodeByTypeAndKey("Metric", slug);
  }

  listNodesByType(type: NodeType): GraphNode[] {
    const rows = this.db
      .prepare("SELECT * FROM nodes WHERE type = ? ORDER BY key")
      .all(type) as NodeRow[];
    return rows.map(rowToNode);
  }

  /** Case-insensitive substring match against key and title. */
  searchNodes(query: string, types?: NodeType[]): GraphNode[] {
    const like = `%${query.toLowerCase()}%`;
    const typeFilter = types && types.length > 0 ? `AND type IN (${types.map(() => "?").join(",")})` : "";
    const rows = this.db
      .prepare(
        `SELECT * FROM nodes
         WHERE (LOWER(key) LIKE ? OR LOWER(title) LIKE ?) ${typeFilter}
         ORDER BY type, key`,
      )
      .all(like, like, ...(types ?? [])) as NodeRow[];
    return rows.map(rowToNode);
  }

  getOutgoingEdges(nodeId: string, type?: EdgeType): GraphEdge[] {
    const rows = type
      ? (this.db
          .prepare("SELECT * FROM edges WHERE from_id = ? AND type = ?")
          .all(nodeId, type) as EdgeRow[])
      : (this.db.prepare("SELECT * FROM edges WHERE from_id = ?").all(nodeId) as EdgeRow[]);
    return rows.map(rowToEdge);
  }

  getIncomingEdges(nodeId: string, type?: EdgeType): GraphEdge[] {
    const rows = type
      ? (this.db
          .prepare("SELECT * FROM edges WHERE to_id = ? AND type = ?")
          .all(nodeId, type) as EdgeRow[])
      : (this.db.prepare("SELECT * FROM edges WHERE to_id = ?").all(nodeId) as EdgeRow[]);
    return rows.map(rowToEdge);
  }

  countsByType(): { nodes: Record<string, number>; edges: Record<string, number> } {
    const nodeRows = this.db
      .prepare("SELECT type, COUNT(*) as count FROM nodes GROUP BY type")
      .all() as { type: string; count: number }[];
    const edgeRows = this.db
      .prepare("SELECT type, COUNT(*) as count FROM edges GROUP BY type")
      .all() as { type: string; count: number }[];
    return {
      nodes: Object.fromEntries(nodeRows.map((r) => [r.type, r.count])),
      edges: Object.fromEntries(edgeRows.map((r) => [r.type, r.count])),
    };
  }
}
