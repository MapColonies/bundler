export class CheckError extends Error {
  public constructor(message: string, public argument: string | string[], public received?: unknown) {
    super(message);
    Object.setPrototypeOf(this, CheckError.prototype);
  }
}
