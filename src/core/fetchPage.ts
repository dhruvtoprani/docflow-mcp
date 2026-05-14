import { normalizeUrl } from "./normalizeUrl.js";

export async function fetchPage(url: string): Promise<{
  url: string;
  html: string;
  status: number;
}> {
  const normalizedUrl = normalizeUrl(url);
  const userAgent =
    process.env.DOCFLOW_USER_AGENT ||
    "DocFlowMCP/0.1 (+https://github.com/dhruvtoprani/docflow-mcp)";

  const response = await fetch(normalizedUrl, {
    headers: {
      "User-Agent": userAgent
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page. Status: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  const html = await response.text();

  return {
    url: response.url || normalizedUrl,
    html,
    status: response.status
  };
}
