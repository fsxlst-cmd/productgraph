import Database from "better-sqlite3";

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS nodes (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  key         TEXT NOT NULL,
  title       TEXT,
  properties  TEXT NOT NULL,
  source_file TEXT
);

CREATE TABLE IF NOT EXISTS edges (
  id         TEXT PRIMARY KEY,
  from_id    TEXT NOT NULL REFERENCES nodes(id),
  to_id      TEXT NOT NULL REFERENCES nodes(id),
  type       TEXT NOT NULL,
  properties TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_nodes_type_key ON nodes(type, key);
CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_id, type);
CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_id, type);
`;

export function applySchema(db: Database.Database): void {
  db.exec(SCHEMA_SQL);
}

/** Opens (creating if needed) a writable db and ensures the schema exists. */
export function openWritableDb(path: string): Database.Database {
  const db = new Database(path);
  applySchema(db);
  return db;
}

/** Opens an existing db strictly read-only; throws if it doesn't exist. */
export function openReadOnlyDb(path: string): Database.Database {
  return new Database(path, { readonly: true, fileMustExist: true });
}
