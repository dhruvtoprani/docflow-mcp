export class DocFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocFlowError";
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}
