## Why

Product context (why a feature exists, what goal/metric it serves, what it relates to, how it evolved) currently lives only in scattered prose across PRD documents, if it's written down at all. When a PRD is added or revised, there is no queryable structure an LLM can use to understand what already exists in the product, which makes it hard to spot conflicts with existing features and hard to generate test scenarios that reflect the real system context rather than just the text of one document. `productgraph` solves this the same way `codegraph` solves the equivalent problem for source code: turn a structured, human-authored ground truth into a deterministic, queryable graph that any LLM session can read via MCP, without the tool itself ever having to guess at meaning.

## What Changes

- Introduce a `prds/<feature-slug>/<date>-<label>.md` file convention: PRDs are the ground truth, one dated file per revision, never edited in place. Each file carries structured YAML frontmatter (feature slug, title, date, status, goals, metrics with target/baseline, related_features, supersedes) plus free-text prose sections.
- Add a `productgraph` CLI with `init`, `index` (full rebuild), and `status` commands. Indexing is a pure, deterministic parse of frontmatter across all PRD files into a SQLite graph — no LLM calls anywhere inside the tool.
- Define the graph schema: `Product`, `Feature` (stable identity across revisions), `PRDVersion` (one per dated file, chained via `supersedes`), `Goal`, `Metric` nodes, and their edges (`HAS_VERSION`, `SUPERSEDES`, `SERVES`, `TARGETS`, `RELATES_TO`, `DEPENDS_ON`).
- Commit the resulting `.productgraph/productgraph.db` (SQLite) to the repo as a build artifact — disposable and fully regeneratable from `prds/**`, safe to delete and rebuild, never hand-edited, never migrated.
- Add a read-only MCP server exposing five query tools over the committed graph: `productgraph_search`, `productgraph_explore`, `productgraph_node`, `productgraph_history`, `productgraph_impact`.

**Explicit non-goals for this change:**
- No LLM extraction from PRD prose at index time — only structured frontmatter is parsed.
- No test-scenario generation inside the tool — that's left to whatever LLM session consumes the graph via MCP.
- No incremental `sync`, no connection-suggestion tooling, no review-workflow automation — these are deferred to follow-up changes once the core store and query surface are proven.

## Capabilities

### New Capabilities
- `prd-indexing`: Deterministic parsing of the `prds/**` frontmatter convention into a committed SQLite graph, via the `productgraph` CLI (`init`, `index`, `status`).
- `graph-query-mcp`: Read-only MCP server exposing `productgraph_search`, `productgraph_explore`, `productgraph_node`, `productgraph_history`, and `productgraph_impact` over the indexed graph.

### Modified Capabilities
_None — this is a new, empty project._

## Impact

- New repo structure: `prds/` (ground truth PRDs, human-authored/edited), `.productgraph/productgraph.db` (generated, committed).
- New CLI binary `productgraph` (package/language choice made in design.md).
- New MCP server process, installable into Claude Code / other MCP clients, analogous to how `codegraph serve --mcp` is installed today.
- No dependency on git history for feature history — history is derived entirely from the `date` field and `supersedes` chain in frontmatter, so a full reindex after fixing a mistaken date self-heals the graph with no migration step.
