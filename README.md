# productgraph

A deterministic PRD-to-graph indexer and read-only MCP query server for
product context — the same shape as [codegraph](https://www.npmjs.com/package/@colbymchenry/codegraph),
but for product decisions instead of source code.

PRD markdown files are the ground truth. `productgraph` never calls an LLM
itself: it parses structured frontmatter into a SQLite graph
(`.productgraph/productgraph.db`), commits that graph to the repo as a
build artifact, and exposes it read-only over MCP so any LLM session (e.g.
Claude Code) can query product context — goals, metrics, related features,
version history — before drafting a PRD review, a test plan, or anything
else that needs to know *why* a feature exists.

## File conventions

```
prds/
  <feature-slug>/
    <date>-<label>.md      # one file per revision, never edited in place
goals/
  <goal-slug>.md            # declared once, referenced by slug from PRDs
metrics/
  <metric-slug>.md          # declared once, referenced by slug from PRDs
```

### `prds/<feature-slug>/<date>-<label>.md`

```markdown
---
feature: checkout-flow       # must match the directory name
title: Checkout Flow
date: "2026-07-09"            # YYYY-MM-DD — drives history ordering, not git
status: active                 # draft | active | deprecated
goals: [reduce-churn]           # slugs, must exist under goals/
metrics:
  - metric: d7-retention        # slug, must exist under metrics/
    target: "25%"
    baseline: "20%"
related_features: [paypal-support]   # slugs, must exist under prds/
depends_on: []
supersedes: 2026-06-15-add-paypal    # previous file's base name, same feature, earlier date
---

## Why
...

## Scope / Non-goals
...
```

Revising a feature means adding a **new** dated file, not editing an
existing one — that's what makes history queryable without ever touching
git history.

### `goals/<goal-slug>.md` and `metrics/<metric-slug>.md`

```markdown
---
goal: reduce-churn
title: Reduce churn
description: Optional.
---
```

```markdown
---
metric: d7-retention
title: Day-7 retention
description: Optional.
unit: percent
---
```

Referencing a goal or metric slug that has no matching registry file is a
hard indexing error — this is the deterministic substitute for LLM-based
deduplication: there's exactly one place to declare "reduce churn," so two
PRDs can't accidentally fragment it into two near-duplicate goals.

## CLI usage

```bash
productgraph init [path]     # scaffold prds/, goals/, metrics/, .productgraph/
productgraph index [path]    # full rebuild: parse everything, atomically replace productgraph.db
productgraph status [path]   # node/edge counts, last index time, warnings
productgraph serve --mcp [path]   # start the read-only MCP server over stdio
```

`productgraph.db` is committed to the repo — it's a disposable, fully
regeneratable build artifact (like a lockfile), never hand-edited. If it
ever looks wrong, delete `.productgraph/productgraph.db` and run
`productgraph index` again; a clean rebuild from unchanged source files
produces a byte-identical result.

## Registering the MCP server (Claude Code)

Add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "productgraph": {
      "type": "stdio",
      "command": "productgraph",
      "args": ["serve", "--mcp"]
    }
  }
}
```

### Available tools

| Tool | Purpose |
|---|---|
| `productgraph_search` | Keyword search across features, goals, and metrics |
| `productgraph_explore` | Full neighborhood context around a feature (or, for a goal/metric, which features use it) |
| `productgraph_node` | One node's raw properties and every edge, in or out |
| `productgraph_history` | A feature's PRD version timeline, with a field-level diff between each version and the one before it |
| `productgraph_impact` | What would be affected by changing this feature/goal/metric — dependent/related features, or every feature serving/targeting it |

## Development

```bash
npm install
npm run build       # tsc -> dist/
npm run dev -- <command>   # run the CLI from source via tsx, e.g. `npm run dev -- status`
npm test             # vitest run
```

`test/fixtures/sample-product/` is a small hand-authored product (5
features, one with two chained PRD versions, a goal and a metric shared
across two features) used by both the indexer tests and the MCP tool tests.
