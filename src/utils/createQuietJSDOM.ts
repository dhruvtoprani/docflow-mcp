import { JSDOM, type ConstructorOptions, VirtualConsole } from "jsdom";

function isIgnorableCssParseError(message: string): boolean {
  return message.includes("Could not parse CSS stylesheet");
}

export function createQuietJSDOM(html: string, options: ConstructorOptions = {}): JSDOM {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (isIgnorableCssParseError(message)) {
      return;
    }

    // Preserve visibility into non-CSS parser issues.
    console.warn(`[jsdom] ${message}`);
  });

  return new JSDOM(html, {
    ...options,
    virtualConsole
  });
}
