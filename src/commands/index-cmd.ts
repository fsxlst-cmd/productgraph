import { IndexValidationError } from "../index/errors.js";
import { runFullIndex, type IndexResult } from "../index/indexer.js";

export async function runIndex(root: string): Promise<IndexResult | undefined> {
  try {
    const result = runFullIndex(root);
    console.log(`Indexed successfully at ${result.indexedAt}`);
    for (const [type, count] of Object.entries(result.counts.nodes)) {
      console.log(`  ${type}: ${count} node(s)`);
    }
    for (const [type, count] of Object.entries(result.counts.edges)) {
      console.log(`  ${type}: ${count} edge(s)`);
    }
    return result;
  } catch (err) {
    if (err instanceof IndexValidationError) {
      console.error(err.message);
      process.exitCode = 1;
      return undefined;
    }
    throw err;
  }
}
