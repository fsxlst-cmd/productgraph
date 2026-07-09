## 1. Project Setup

- [x] 1.1 Initialize Node.js + TypeScript project (`package.json`, `tsconfig.json`), add `better-sqlite3`, `gray-matter`, `@modelcontextprotocol/sdk`, and a CLI framework (e.g. `commander`) as dependencies
- [x] 1.2 Set up build/lint/test scripts and a test runner (e.g. `vitest`)
- [x] 1.3 Define the `productgraph` CLI entry point with `init`, `index`, `status`, and `serve --mcp` subcommands wired to stubs

## 2. Graph Schema and Data Access Layer

- [x] 2.1 Implement `nodes`/`edges` SQLite DDL from design.md Decision 2, with indices
- [x] 2.2 Implement deterministic ID derivation for `Feature`, `PRDVersion`, `Goal`, `Metric` (design.md Decision 3)
- [x] 2.3 Implement a typed data-access module (`getFeature`, `getGoal`, `getMetric`, `getEdges`, etc.) so raw JSON `properties` parsing is isolated to one place
- [x] 2.4 Write unit tests for ID derivation and the data-access module against an in-memory/temp SQLite db

## 3. Frontmatter Parsing and Validation

- [x] 3.1 Define and document the frontmatter schema for feature PRDs (`feature`, `title`, `date`, `status`, `goals`, `metrics` with `target`/`baseline`, `related_features`, `depends_on`, `supersedes`)
- [x] 3.2 Define and document the frontmatter schema for `goals/<slug>.md` and `metrics/<slug>.md` registry files
- [x] 3.3 Implement frontmatter parsing with `gray-matter` for all three file kinds
- [x] 3.4 Implement referential integrity validation: unresolved `goals`/`metrics` slugs are hard errors (spec: Registry-enforced referential integrity)
- [x] 3.5 Implement referential integrity validation: unresolved `related_features`/`depends_on` slugs are hard errors (spec: Referential integrity for related and dependent features)
- [x] 3.6 Implement `supersedes` chain validation, including strict date ordering (spec: Supersedes chain ordering)
- [x] 3.7 Write unit tests covering valid parsing plus each validation failure mode, asserting the error identifies the offending file and field

## 4. Indexer (`productgraph index`)

- [x] 4.1 Implement full-rebuild traversal of `prds/**/*.md`, `goals/*.md`, `metrics/*.md`
- [x] 4.2 Implement graph construction: create `Feature`/`PRDVersion`/`Goal`/`Metric` nodes and `HAS_VERSION`/`SUPERSEDES`/`SERVES`/`TARGETS`/`RELATES_TO`/`DEPENDS_ON` edges per spec
- [x] 4.3 Implement atomic rebuild: write to a temp db file inside a single transaction, then atomically rename over `.productgraph/productgraph.db` only on success (spec: Atomic rebuild)
- [x] 4.4 Implement the gitignored `.productgraph/last-index.json` sidecar (indexedAt, warnings) per design.md Decision 7
- [x] 4.5 Write an idempotency test: index twice with no source changes, assert byte-identical `productgraph.db` output (spec: Idempotent, byte-identical rebuilds)
- [x] 4.6 Write a failure-safety test: force a validation error partway through indexing, assert the previously-committed db is untouched

## 5. CLI Commands

- [x] 5.1 Implement `productgraph init`: scaffold `prds/`, `goals/`, `metrics/`, `.productgraph/` (with `.gitignore` for `last-index.json` and any temp/lock files, but NOT for `productgraph.db` itself)
- [x] 5.2 Implement `productgraph index` wiring to the indexer module, with clear error output on validation failures (file + field identified)
- [x] 5.3 Implement `productgraph status`: report node/edge counts by type, last successful index timestamp, and warnings from `last-index.json`
- [x] 5.4 Write CLI integration tests for `init` → `index` → `status` against a fixture `prds/` tree

## 6. MCP Server

- [x] 6.1 Implement `productgraph serve --mcp`, opening `.productgraph/productgraph.db` read-only via `better-sqlite3`
- [x] 6.2 Implement `productgraph_search` tool
- [x] 6.3 Implement `productgraph_node` tool
- [x] 6.4 Implement `productgraph_explore` tool (feature mode and goal/metric mode)
- [x] 6.5 Implement `productgraph_history` tool, including the at-query-time predecessor diff (design.md Decision 9)
- [x] 6.6 Implement `productgraph_impact` tool
- [x] 6.7 Write integration tests for each tool against a fixture-populated `productgraph.db`, including not-found and empty-result cases

## 7. Fixtures and Documentation

- [x] 7.1 Build a small fixture product (3-5 features, multiple PRD versions on at least one, a shared goal and metric across two features) used by both indexer and MCP tests
- [x] 7.2 Write a top-level README covering: `prds/`/`goals/`/`metrics/` file conventions, CLI usage, and how to register the MCP server with an MCP client (e.g. Claude Code's `.mcp.json`)

## 8. End-to-End Verification

- [x] 8.1 Run `productgraph init` → author the fixture PRDs by hand → `productgraph index` → `productgraph status` and confirm expected counts
- [x] 8.2 Start `productgraph serve --mcp`, connect an MCP client, and manually exercise all five tools against the fixture data to confirm response shapes match the specs
