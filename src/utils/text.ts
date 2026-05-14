export function clipText(input: string, maxChars: number): string {
  if (input.length <= maxChars) {
    return input;
  }

  return `${input.slice(0, maxChars)}...`;
}
