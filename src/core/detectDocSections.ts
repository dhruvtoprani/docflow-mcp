import type { DetectedSections } from "../types/docflow.js";

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function detectDocSections(markdown: string): DetectedSections {
  const text = markdown.toLowerCase();

  return {
    installation: hasAny(text, [
      /install/,
      /\bnpm\b/,
      /\byarn\b/,
      /\bpnpm\b/,
      /\bpip\b/,
      /setup/,
      /quickstart/,
      /getting started/,
      /prerequisite/
    ]),
    authentication: hasAny(text, [
      /\bauth\b/,
      /api key/,
      /bearer/,
      /token/,
      /authorization/,
      /oauth/,
      /authenticated/,
      /credentials/,
      /personal access token/,
      /\bpat\b/
    ]),
    endpoint: hasAny(text, [
      /endpoint/,
      /\bpost\s+\//,
      /\bget\s+\//,
      /\bput\s+\//,
      /\bdelete\s+\//,
      /\bpatch\s+\//,
      /\/api/,
      /\bcurl\b/,
      /api reference/,
      /rest api/
    ]),
    parameters: hasAny(text, [
      /parameter/,
      /\bparams?\b/,
      /request body/,
      /\bpayload\b/,
      /\bfield\b/,
      /\brequired\b/,
      /query string/,
      /\bschema\b/
    ]),
    requestExample: hasAny(text, [
      /request/,
      /example/,
      /\bcurl\b/,
      /fetch\(/,
      /\baxios\b/,
      /http request/,
      /sample request/
    ]),
    responseExample: hasAny(text, [
      /response/,
      /\breturns?\b/,
      /status code/,
      /\b200\b/,
      /\b201\b/,
      /\bjson\b/,
      /example response/
    ]),
    errors: hasAny(text, [
      /\berror\b/,
      /\b400\b/,
      /\b401\b/,
      /\b403\b/,
      /\b404\b/,
      /\b409\b/,
      /\b422\b/,
      /\b429\b/,
      /\b500\b/,
      /unauthorized/,
      /forbidden/,
      /bad request/
    ]),
    rateLimits: hasAny(text, [
      /rate[\s-]?limit/,
      /\bquota\b/,
      /\b429\b/,
      /throttl/,
      /requests\/(min|minute|hour|day)/
    ]),
    security: hasAny(text, [
      /\bsecret\b/,
      /environment variable/,
      /env var/,
      /server-side/,
      /client-side/,
      /\bexpose\b/,
      /least privilege/,
      /rotate (?:keys|secrets?)/
    ])
  };
}
