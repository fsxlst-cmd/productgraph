import { IndexError } from "./errors.js";
import type { LoadedFeatureVersion } from "./types.js";

export function validateGoalReferences(
  version: LoadedFeatureVersion,
  knownGoalSlugs: ReadonlySet<string>,
): IndexError[] {
  return version.frontmatter.goals
    .filter((slug) => !knownGoalSlugs.has(slug))
    .map(
      (slug) =>
        new IndexError(version.filePath, `references unknown goal "${slug}" (no goals/${slug}.md found)`),
    );
}

export function validateMetricReferences(
  version: LoadedFeatureVersion,
  knownMetricSlugs: ReadonlySet<string>,
): IndexError[] {
  return version.frontmatter.metrics
    .filter((ref) => !knownMetricSlugs.has(ref.metric))
    .map(
      (ref) =>
        new IndexError(
          version.filePath,
          `references unknown metric "${ref.metric}" (no metrics/${ref.metric}.md found)`,
        ),
    );
}

export function validateFeatureReferences(
  version: LoadedFeatureVersion,
  fieldName: "related_features" | "depends_on",
  knownFeatureSlugs: ReadonlySet<string>,
): IndexError[] {
  return version.frontmatter[fieldName]
    .filter((slug) => !knownFeatureSlugs.has(slug))
    .map(
      (slug) =>
        new IndexError(version.filePath, `${fieldName} references unknown feature "${slug}"`),
    );
}

export function validateSupersedes(
  version: LoadedFeatureVersion,
  siblingVersionsByFileBaseName: ReadonlyMap<string, LoadedFeatureVersion>,
): IndexError[] {
  const target = version.frontmatter.supersedes;
  if (!target) return [];

  const referenced = siblingVersionsByFileBaseName.get(target);
  if (!referenced) {
    return [
      new IndexError(
        version.filePath,
        `supersedes unknown version "${target}" (no prds/${version.featureSlug}/${target}.md found)`,
      ),
    ];
  }

  if (!(referenced.frontmatter.date < version.frontmatter.date)) {
    return [
      new IndexError(
        version.filePath,
        `supersedes "${target}" but its date (${referenced.frontmatter.date}) is not strictly earlier than this version's date (${version.frontmatter.date})`,
      ),
    ];
  }

  return [];
}
