## ADDED Requirements

### Requirement: Deterministic frontmatter-only parsing
The indexer SHALL derive all graph nodes and edges exclusively from YAML frontmatter in `prds/**/*.md`, `goals/*.md`, and `metrics/*.md` files. The indexer SHALL NOT call an LLM, and SHALL NOT infer nodes or edges from free-text prose content.

#### Scenario: Indexing a valid feature PRD
- **WHEN** `productgraph index` runs over a `prds/checkout-flow/2026-07-09-refactor.md` file with valid frontmatter (feature slug, title, date, status, goals, metrics, related_features)
- **THEN** the graph contains a `Feature` node with key `checkout-flow`, a `PRDVersion` node for that file, a `HAS_VERSION` edge between them, and `SERVES`/`TARGETS`/`RELATES_TO` edges for each referenced goal/metric/related feature

#### Scenario: Prose content is never parsed for structure
- **WHEN** a PRD's free-text body mentions a goal or feature by name that is not also declared in its frontmatter
- **THEN** the indexer SHALL NOT create any node or edge for that mention

### Requirement: Idempotent, byte-identical rebuilds
Running `productgraph index` twice in succession with no changes to any source file under `prds/`, `goals/`, or `metrics/` SHALL produce a byte-identical `productgraph.db` file, aside from the gitignored index-run sidecar file.

#### Scenario: Re-index with no file changes
- **WHEN** `productgraph index` is run a second time with no changes to any PRD, goal, or metric file
- **THEN** the resulting `.productgraph/productgraph.db` is byte-identical to the prior run's output

#### Scenario: Deterministic IDs across runs
- **WHEN** the same feature slug and PRD file path are indexed in two separate runs
- **THEN** the generated node IDs for that `Feature` and `PRDVersion` are identical in both runs

### Requirement: Registry-enforced referential integrity for goals and metrics
Every `goals:` and `metrics:` slug referenced in a PRD's frontmatter SHALL correspond to an existing `goals/<slug>.md` or `metrics/<slug>.md` registry file. The indexer SHALL treat an unresolvable slug as a hard error and SHALL NOT create a placeholder node for it.

#### Scenario: PRD references an undeclared goal
- **WHEN** a PRD's frontmatter lists a goal slug with no matching `goals/<slug>.md` file
- **THEN** `productgraph index` fails with an error identifying the offending file and the missing slug, and SHALL NOT write a new `productgraph.db`

#### Scenario: PRD references a declared goal
- **WHEN** a PRD's frontmatter lists a goal slug that matches an existing `goals/<slug>.md` file
- **THEN** the indexer creates a `SERVES` edge from the `Feature` to the existing `Goal` node, reusing that node rather than creating a duplicate

### Requirement: Referential integrity for related and dependent features
Every slug listed in a PRD's `related_features` or `depends_on` frontmatter fields SHALL correspond to an existing `prds/<slug>/` directory. Unresolvable references SHALL be a hard indexing error.

#### Scenario: PRD references a nonexistent feature
- **WHEN** a PRD's `related_features` field lists a slug with no corresponding `prds/<slug>/` directory
- **THEN** `productgraph index` fails with an error identifying the offending file and the unknown feature slug

### Requirement: Supersedes chain ordering
A PRD version's `supersedes` field, when present, SHALL reference another dated file within the same feature directory, and that referenced file's `date` SHALL be strictly earlier than the current file's `date`.

#### Scenario: Valid supersedes chain
- **WHEN** `2026-07-09-refactor.md` declares `supersedes: 2026-06-15-add-paypal`, and that file exists in the same feature directory with an earlier date
- **THEN** the indexer creates a `SUPERSEDES` edge from the newer `PRDVersion` node to the older one

#### Scenario: Supersedes target has a later or equal date
- **WHEN** a PRD's `supersedes` field references a file whose `date` is not strictly earlier than its own
- **THEN** `productgraph index` fails with an error identifying the inconsistent date ordering

### Requirement: Atomic rebuild
`productgraph index` SHALL write the rebuilt graph to a temporary file and atomically replace the previously-committed `productgraph.db` only after the full rebuild succeeds. A failed or interrupted index run SHALL leave the previously-committed `productgraph.db` unchanged.

#### Scenario: Index run fails validation partway through
- **WHEN** `productgraph index` encounters a referential integrity error after successfully parsing some files
- **THEN** the previously-committed `.productgraph/productgraph.db` remains exactly as it was before the run started

### Requirement: CLI init, index, and status commands
The `productgraph` CLI SHALL provide `init` (scaffold `prds/`, `goals/`, `metrics/`, and `.productgraph/` in a target directory), `index` (full rebuild as described above), and `status` (report node/edge counts by type, last successful index time, and any warnings from the last run).

#### Scenario: Initializing a new project
- **WHEN** `productgraph init` is run in an empty directory
- **THEN** it creates `prds/`, `goals/`, `metrics/`, and `.productgraph/` directories, and `.productgraph/productgraph.db` does not yet exist until `index` is run

#### Scenario: Checking status after indexing
- **WHEN** `productgraph status` is run after a successful `productgraph index`
- **THEN** it reports the count of each node type, the count of each edge type, and the timestamp of the last successful index
