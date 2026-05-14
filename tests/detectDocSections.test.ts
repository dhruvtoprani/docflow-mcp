import { describe, expect, it } from "vitest";
import { detectDocSections } from "../src/core/detectDocSections.js";

describe("detectDocSections", () => {
  it("detects key implementation sections from markdown", () => {
    const markdown = `
Authorization: Bearer <token>
POST /emails
Request body
Response
401 Unauthorized
Rate limit: 100 requests/minute
    `;

    const result = detectDocSections(markdown);

    expect(result.authentication).toBe(true);
    expect(result.endpoint).toBe(true);
    expect(result.parameters).toBe(true);
    expect(result.responseExample).toBe(true);
    expect(result.errors).toBe(true);
    expect(result.rateLimits).toBe(true);
  });

  it("detects broader overview-style docs language", () => {
    const markdown = `
REST API reference overview
Getting started in the quickstart
Authenticated requests require credentials
See the schema and required fields
Example response includes JSON payload
    `;

    const result = detectDocSections(markdown);

    expect(result.endpoint).toBe(true);
    expect(result.installation).toBe(true);
    expect(result.authentication).toBe(true);
    expect(result.parameters).toBe(true);
    expect(result.responseExample).toBe(true);
  });
});
