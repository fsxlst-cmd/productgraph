## Context

This is a greenfield project. There is no existing code, schema, or CLI to integrate with — every decision below is a fresh choice, made by analogy to `codegraph` (a Node.js CLI + MCP server that indexes source code into a committed SQLite graph) but adapted for the fact that `productgraph`'s ground truth is human-authored PRD markdown, not deterministically-parseable source code, and its output database is *intentionally* committed to the repo rather than gitignored.

The proposal already fixed the big structural calls: PRDs live under `prds/<feature-slug>/<date>-<label>.md`, never edited in place; frontmatter is the only thing parsed into the graph (no LLM in the indexer); the `.productgraph/productgraph.db` is a disposable, regeneratable build artifact. This document works out the schema, tool contracts, and CLI mechanics needed to build that.

## Goals / Non-Goals

**Goals:**
- A graph schema flexible enough to add new node/edge types later without a migration step (rebuild-from-scratch is the only "migration" this system ever needs).
- Deterministic, idempotent indexing: running `productgraph index` twice on unchanged files produces a byte-identical committed artifact.
- Referential integrity enforced at index time (unknown `related_features`/`goals`/`metrics` slugs are hard errors, not silently-created stub nodes) — this is the mechanism that prevents the "reduces-churn vs improves-retention" near-duplicate fragmentation problem, in place of fuzzy/LLM matching.
- A read-only MCP query surface that can run safely alongside a concurrent reindex.

**Non-Goals:**
- No incremental `sync` (full rebuild only in v1).
- No LLM calls anywhere inside `productgraph` itself.
- No connection-suggestion or review-workflow tooling (that's a distinct, later change layered on top of these MCP tools).
- No multi-product namespacing — v1 assumes one `prds/` root is one product.

## Decisions

**1. Language/runtime: Node.js + TypeScript, `better-sqlite3`, `@modelcontextprotocol/sdk`, `gray-matter` for frontmatter.**
Mirrors codegraph's own stack, which means the same install/MCP-registration UX (`productgraph install`, `.mcp.json` entry, `productgraph serve --mcp`) users already have muscle memory for. `better-sqlite3` gives synchronous, transactional writes, which matters for the atomic-rebuild strategy below.
*Alternative considered:* Python + `sqlite3` stdlib — rejected only because it diverges from the ecosystem convention this project is explicitly modeling itself on; revisit if the user's actual toolchain preference differs.

**2. Generic property-graph schema instead of one relational table per node type.**
```sql
CREATE TABLE nodes (
  id         TEXT PRIMARY KEY,   -- deterministic, derived from slug/path (see Decision 3)
  type       TEXT NOT NULL,      -- 'Product' | 'Feature' | 'PRDVersion' | 'Goal' | 'Metric'
  key        TEXT NOT NULL,      -- human-facing slug, unique within type
  title      TEXT,
  properties TEXT NOT NULL,      -- JSON blob: type-specific fields (status, date, target, baseline, ...)
  source_file TEXT               -- relative path this node was derived from, for traceability
);
CREATE TABLE edges (
  id         TEXT PRIMARY KEY,
  from_id    TEXT NOT NULL REFERENCES nodes(id),
  to_id      TEXT NOT NULL REFERENCES nodes(id),
  type       TEXT NOT NULL,      -- 'HAS_VERSION' | 'SUPERSEDES' | 'SERVES' | 'TARGETS' | 'RELATES_TO' | 'DEPENDS_ON'
  properties TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_nodes_type_key ON nodes(type, key);
CREATE INDEX idx_edges_from ON edges(from_id, type);
CREATE INDEX idx_edges_to ON edges(to_id, type);
```
Adding a new node type (e.g. `Decision`, `Persona` later) or edge type never touches this DDL — it's just new `type` values and new JSON shapes. That keeps "delete and rebuild" the only migration path forever, matching the proposal's stated non-goal of ever hand-migrating the db.
*Alternative considered:* typed tables (`features`, `goals`, `metrics`, ...) — better SQL-level type safety and simpler queries, but every new node type becomes a schema change. Rejected in favor of extensibility; a thin TypeScript access layer recovers most of the type safety in application code instead.

**3. Deterministic IDs derived from path/slug, never random UUIDs.**
- `Feature` id = feature slug (the `prds/<feature-slug>/` directory name).
- `PRDVersion` id = the file's relative path minus extension (`checkout-flow/2026-07-09-refactor`).
- `Goal`/`Metric` id = their registry slug (see Decision 4).
This is what makes rebuilds byte-identical: the same files always produce the same ids, so the committed `.db` doesn't churn on unrelated bytes between runs.

**4. Goals and Metrics are declared once in a registry, referenced by slug everywhere else.**
`goals/<slug>.md` and `metrics/<slug>.md` (sibling to `prds/`), each a small frontmatter-only file (title, description; metrics also carry a `unit`). A PRD's `goals:`/`metrics:` frontmatter fields are slug references into this registry, not inline definitions. The indexer hard-fails if a PRD references a slug with no matching registry file.
*Why:* this is the deterministic substitute for LLM-based semantic deduplication. Two PRDs that both mean "reduce churn" are forced to agree on one `reduce-churn` slug because there's exactly one place to declare it, instead of each PRD author writing their own phrasing and the graph silently fragmenting. It also gives `target`/`baseline` values a stable home (declared per-feature-usage in the PRD frontmatter, since the same metric can have different targets for different features) versus the metric's definition itself (declared once in the registry).
*Alternative considered:* let PRDs declare goals/metrics inline and dedupe via embedding similarity at index time — rejected per the proposal's explicit "don't improvise" non-goal; that's exactly the kind of fuzzy inference the deterministic indexer is designed to avoid.

**5. `related_features`/`depends_on` must reference existing `prds/<slug>/` directories; unknown references are hard errors.**
Same referential-integrity logic as Decision 4, applied to feature-to-feature edges. Keeps the graph free of stub/typo nodes without needing any matching logic.

**6. Atomic rebuild: write to a temp file, then rename over the committed `.db`.**
`productgraph index` never mutates `.productgraph/productgraph.db` in place. It builds `.productgraph/productgraph.db.tmp` inside a single transaction, then does an atomic filesystem rename. A crash mid-index leaves the previously-committed db untouched.

**7. Index-run metadata (timestamps, warning logs) lives in a gitignored sidecar file, not inside the committed db.**
`.productgraph/last-index.json` (gitignored) holds `{ indexedAt, warnings[] }`. Keeping this out of the committed `.db` is what makes Decision 3's byte-identical-rebuild property actually hold — a timestamp baked into the db would make every rebuild diff even when no PRD content changed.

**8. MCP server opens the db read-only (`better-sqlite3` `readonly: true`).**
`productgraph serve --mcp` never writes. This guarantees the query surface can't corrupt the graph, and can safely run in one terminal while `productgraph index` rebuilds in another — worst case a query reads slightly-stale data until the next connection/query after the atomic rename lands.

**9. `productgraph_history` computes diffs at query time, not at index time.**
Rather than storing "what changed" as index-time output, `productgraph_history(feature)` walks the `PRDVersion` chain (via `SUPERSEDES` edges, ordered by the `date` field) and diffs each version's `properties` JSON against its predecessor on the fly. Keeps the schema simple (Decision 2) and the diff logic in one place, callable identically from the CLI (`productgraph status` could reuse it later) and the MCP tool.

## Risks / Trade-offs

- **Binary `.db` committed to git → no meaningful line-level diffs on `git diff`.** → Mitigation: the PRD markdown remains the diffable, reviewable source of truth; the `.db` is reviewed indirectly (via `productgraph status`/query output) or by trusting `productgraph index` is deterministic. A future CI check can assert "the committed db matches a fresh reindex" to catch drift.
- **Generic nodes/edges schema trades SQL type-safety for extensibility.** → Mitigation: a typed data-access module in TypeScript (`getFeature()`, `getGoal()`, ...) is the only code allowed to touch raw JSON `properties`, so type errors surface at the application layer even though SQLite itself doesn't enforce shape.
- **Full-rebuild-only indexing is O(all PRDs) on every run.** → Acceptable at expected scale (tens–low hundreds of PRDs); revisit with an incremental `sync` (mtime/hash-based, same pattern as codegraph's `index` vs `sync` split) in a follow-up change if this becomes slow.
- **Hard-fail referential integrity means a typo'd slug blocks indexing entirely, not just that one feature.** → This is intentional (fail fast, whole-graph correctness over partial availability) but worth flagging: `productgraph status` must surface *which* file and *which* field caused the failure clearly, or this will be a frustrating error message to debug.

## Migration Plan

N/A — greenfield project, first change. Nothing to migrate from.

## Open Questions

- Where should `goals/` and `metrics/` registries live relative to `prds/` — sibling top-level dirs (as assumed above) or nested under `prds/_registry/`? Either works; pick whichever reads more naturally once the PRD template (a follow-up artifact, not this change) is drafted.
- Exact npm package name / CLI binary name (`productgraph` assumed throughout — confirm no npm registry collision before publishing).
- Multi-product scoping is explicitly deferred, but if it's needed sooner than expected, the `Product` node and a `prds/<product>/<feature>/...` path convention would need to be designed together — flagging so it isn't forgotten.
