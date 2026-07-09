## ADDED Requirements

### Requirement: Read-only graph access
The MCP server SHALL open `.productgraph/productgraph.db` in read-only mode and SHALL NOT perform any write operation against it under any tool call.

#### Scenario: Server started while an index rebuild is in progress
- **WHEN** `productgraph serve --mcp` is running and a separate `productgraph index` process rebuilds the database concurrently
- **THEN** the running MCP server's tool calls continue to succeed, reading either the pre-rebuild or post-rebuild committed database, and never cause or encounter a write conflict

### Requirement: productgraph_search tool
The MCP server SHALL expose a `productgraph_search` tool that accepts a keyword query and returns matching `Feature`, `Goal`, and `Metric` nodes by title, key, or slug.

#### Scenario: Searching for a known feature
- **WHEN** `productgraph_search` is called with a query matching an indexed feature's title
- **THEN** the tool returns that feature's type, key, and title among the results

#### Scenario: Searching with no matches
- **WHEN** `productgraph_search` is called with a query matching no node in the graph
- **THEN** the tool returns an empty result list, not an error

### Requirement: productgraph_explore tool
The MCP server SHALL expose a `productgraph_explore` tool that, given a `Feature` key, returns its current `PRDVersion` summary, the `Goal` and `Metric` nodes it serves/targets, its one-hop `related_features`/`depends_on` neighbors, and its most recent version history. Given a `Goal` or `Metric` key, it SHALL return the features that serve or target it.

#### Scenario: Exploring a feature
- **WHEN** `productgraph_explore` is called with a valid `Feature` key
- **THEN** the response includes that feature's current version summary, its served goals, its targeted metrics, its directly related/dependent features, and its recent version history

#### Scenario: Exploring a goal
- **WHEN** `productgraph_explore` is called with a valid `Goal` key
- **THEN** the response includes the list of features that serve that goal

#### Scenario: Exploring an unknown key
- **WHEN** `productgraph_explore` is called with a key that does not match any node in the graph
- **THEN** the tool returns a clear not-found result rather than throwing an unhandled error

### Requirement: productgraph_node tool
The MCP server SHALL expose a `productgraph_node` tool that, given a node key, returns that node's full stored properties and every edge where it is the source or the target, regardless of edge type.

#### Scenario: Inspecting a single node's full edge list
- **WHEN** `productgraph_node` is called with a valid node key
- **THEN** the response includes the node's properties and lists every incoming and outgoing edge with its type and the connected node's key

### Requirement: productgraph_history tool
The MCP server SHALL expose a `productgraph_history` tool that, given a `Feature` key, returns its `PRDVersion` chain ordered by date, with a field-level diff (goals, metrics, related_features, status) computed between each version and its immediate predecessor at query time.

#### Scenario: Viewing history for a feature with multiple versions
- **WHEN** `productgraph_history` is called with a feature key that has three chained `PRDVersion` nodes
- **THEN** the response lists all three versions in chronological order, each annotated with what changed relative to the previous version

#### Scenario: Viewing history for a feature with a single version
- **WHEN** `productgraph_history` is called with a feature key that has exactly one `PRDVersion`
- **THEN** the response lists that single version with no prior-version diff

### Requirement: productgraph_impact tool
The MCP server SHALL expose a `productgraph_impact` tool that, given a `Feature`, `Goal`, or `Metric` key, returns the set of features that would be affected by a change to it: for a feature, other features that `RELATES_TO` or `DEPENDS_ON` it; for a goal or metric, every feature that serves or targets it.

#### Scenario: Impact of changing a depended-upon feature
- **WHEN** `productgraph_impact` is called with the key of a feature that two other features declare as a `depends_on` reference
- **THEN** the response lists both dependent features

#### Scenario: Impact of changing a shared metric
- **WHEN** `productgraph_impact` is called with a metric key that three features target
- **THEN** the response lists all three features
