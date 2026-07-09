import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const PRODUCTGRAPH_GITIGNORE = `# productgraph transient files. productgraph.db itself is intentionally
# NOT listed here — it is a committed build artifact, not local state.
last-index.json
*.tmp
`;

export interface InitResult {
  root: string;
  createdDirs: string[];
}

export async function runInit(root: string): Promise<InitResult> {
  const createdDirs: string[] = [];

  for (const dir of ["prds", "goals", "metrics", ".productgraph"]) {
    const dirPath = path.join(root, dir);
    if (!existsSync(dirPath)) createdDirs.push(dir);
    mkdirSync(dirPath, { recursive: true });
  }

  const gitignorePath = path.join(root, ".productgraph", ".gitignore");
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, PRODUCTGRAPH_GITIGNORE);
  }

  console.log(`Initialized productgraph in ${path.resolve(root)}`);
  console.log("  prds/, goals/, metrics/ — author your PRDs and registries here");
  console.log("  .productgraph/ — run `productgraph index` to build productgraph.db");

  return { root, createdDirs };
}
