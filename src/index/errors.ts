import type { IndexError } from "../parse/errors.js";

export class IndexValidationError extends Error {
  constructor(public readonly errors: IndexError[]) {
    super(
      `productgraph index failed with ${errors.length} error(s):\n` +
        errors.map((e) => `  - ${e.message}`).join("\n"),
    );
    this.name = "IndexValidationError";
  }
}
