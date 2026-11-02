/**
 * Coded failure raised by the local retrospective pipeline. Codes are stable
 * identifiers so callers can branch without parsing messages.
 */
export class RetrospectiveError extends Error {
  constructor(
    readonly code: string,
    message: string = code,
  ) {
    super(message);
    this.name = "RetrospectiveError";
  }
}
