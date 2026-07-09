import type { GraphAccess } from "../db/access.js";
import { edgeId, nodeId, prdVersionKey } from "../db/ids.js";
import type { MetricRef } from "../parse/schema.js";
import type { LoadedFeatureVersion, LoadedGoal, LoadedMetric } from "../parse/types.js";

export interface GraphInputs {
  goals: LoadedGoal[];
  metrics: LoadedMetric[];
  /** Each feature's versions, sorted ascending by date (oldest first). */
  versionsByFeature: ReadonlyMap<string, LoadedFeatureVersion[]>;
}

/** Last occurrence wins if the same metric slug is listed more than once. */
function dedupeMetricRefs(refs: MetricRef[]): MetricRef[] {
  return [...new Map(refs.map((ref) => [ref.metric, ref])).values()];
}

function insertGoalNodes(access: GraphAccess, goals: LoadedGoal[]): void {
  for (const goal of goals) {
    access.insertNode({
      id: nodeId("Goal", goal.slug),
      type: "Goal",
      key: goal.slug,
      title: goal.frontmatter.title,
      properties: { description: goal.frontmatter.description ?? null },
      sourceFile: goal.filePath,
    });
  }
}

function insertMetricNodes(access: GraphAccess, metrics: LoadedMetric[]): void {
  for (const metric of metrics) {
    access.insertNode({
      id: nodeId("Metric", metric.slug),
      type: "Metric",
      key: metric.slug,
      title: metric.frontmatter.title,
      properties: {
        description: metric.frontmatter.description ?? null,
        unit: metric.frontmatter.unit ?? null,
      },
      sourceFile: metric.filePath,
    });
  }
}

function insertFeatureNode(access: GraphAccess, slug: string, latest: LoadedFeatureVersion): void {
  access.insertNode({
    id: nodeId("Feature", slug),
    type: "Feature",
    key: slug,
    title: latest.frontmatter.title,
    properties: { status: latest.frontmatter.status, currentDate: latest.frontmatter.date },
    sourceFile: latest.filePath,
  });
}

/** Current-state edges (SERVES/TARGETS/RELATES_TO/DEPENDS_ON) from the latest version only. */
function insertFeatureRelationshipEdges(access: GraphAccess, featureNodeId: string, latest: LoadedFeatureVersion): void {
  for (const goalSlug of new Set(latest.frontmatter.goals)) {
    access.insertEdge({
      id: edgeId("SERVES", featureNodeId, nodeId("Goal", goalSlug)),
      fromId: featureNodeId,
      toId: nodeId("Goal", goalSlug),
      type: "SERVES",
    });
  }

  for (const metricRef of dedupeMetricRefs(latest.frontmatter.metrics)) {
    access.insertEdge({
      id: edgeId("TARGETS", featureNodeId, nodeId("Metric", metricRef.metric)),
      fromId: featureNodeId,
      toId: nodeId("Metric", metricRef.metric),
      type: "TARGETS",
      properties: { target: metricRef.target ?? null, baseline: metricRef.baseline ?? null },
    });
  }

  for (const relatedSlug of new Set(latest.frontmatter.related_features)) {
    access.insertEdge({
      id: edgeId("RELATES_TO", featureNodeId, nodeId("Feature", relatedSlug)),
      fromId: featureNodeId,
      toId: nodeId("Feature", relatedSlug),
      type: "RELATES_TO",
    });
  }

  for (const dependsSlug of new Set(latest.frontmatter.depends_on)) {
    access.insertEdge({
      id: edgeId("DEPENDS_ON", featureNodeId, nodeId("Feature", dependsSlug)),
      fromId: featureNodeId,
      toId: nodeId("Feature", dependsSlug),
      type: "DEPENDS_ON",
    });
  }
}

function insertVersionNodesAndEdges(
  access: GraphAccess,
  slug: string,
  featureNodeId: string,
  versions: LoadedFeatureVersion[],
): void {
  for (const version of versions) {
    const versionNodeId = nodeId("PRDVersion", prdVersionKey(slug, version.fileBaseName));

    access.insertNode({
      id: versionNodeId,
      type: "PRDVersion",
      key: prdVersionKey(slug, version.fileBaseName),
      title: version.frontmatter.title,
      properties: {
        date: version.frontmatter.date,
        status: version.frontmatter.status,
        goals: version.frontmatter.goals,
        metrics: version.frontmatter.metrics,
        related_features: version.frontmatter.related_features,
        depends_on: version.frontmatter.depends_on,
      },
      sourceFile: version.filePath,
    });

    access.insertEdge({
      id: edgeId("HAS_VERSION", featureNodeId, versionNodeId),
      fromId: featureNodeId,
      toId: versionNodeId,
      type: "HAS_VERSION",
    });

    if (version.frontmatter.supersedes) {
      const targetNodeId = nodeId("PRDVersion", prdVersionKey(slug, version.frontmatter.supersedes));
      access.insertEdge({
        id: edgeId("SUPERSEDES", versionNodeId, targetNodeId),
        fromId: versionNodeId,
        toId: targetNodeId,
        type: "SUPERSEDES",
      });
    }
  }
}

/**
 * Writes the full graph for one indexing run. Feature-level relationship
 * edges (SERVES/TARGETS/RELATES_TO/DEPENDS_ON) reflect only the latest
 * version of each feature — they describe current state. Historical state
 * lives in each PRDVersion node's properties and is diffed at query time.
 */
export function buildGraph(access: GraphAccess, inputs: GraphInputs): void {
  insertGoalNodes(access, inputs.goals);
  insertMetricNodes(access, inputs.metrics);

  const featureSlugs = [...inputs.versionsByFeature.keys()].sort();

  // Pass 1: create every Feature node first, so pass 2 can safely link
  // RELATES_TO/DEPENDS_ON edges between any two features regardless of order.
  for (const slug of featureSlugs) {
    const versions = inputs.versionsByFeature.get(slug);
    if (!versions || versions.length === 0) continue;
    insertFeatureNode(access, slug, versions[versions.length - 1]!);
  }

  // Pass 2: PRDVersion nodes and all edges.
  for (const slug of featureSlugs) {
    const versions = inputs.versionsByFeature.get(slug);
    if (!versions || versions.length === 0) continue;
    const featureNodeId = nodeId("Feature", slug);

    insertFeatureRelationshipEdges(access, featureNodeId, versions[versions.length - 1]!);
    insertVersionNodesAndEdges(access, slug, featureNodeId, versions);
  }
}
