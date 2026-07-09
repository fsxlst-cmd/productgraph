export class IndexError extends Error {
  constructor(
    public readonly file: string,
    detail: string,
  ) {
    super(`${file}: ${detail}`);
    this.name = "IndexError";
  }
}
