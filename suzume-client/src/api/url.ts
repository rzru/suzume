const DEFAULT_API_PORT = 18080;

export function buildApiUrl(path: string, overrideUrl?: string): string {
  if (overrideUrl) {
    return overrideUrl;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_API_PORT}${normalizedPath}`;
}

export function buildWsUrl(path: string): string {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${wsProtocol}//${window.location.hostname}:${DEFAULT_API_PORT}${normalizedPath}`;
}
