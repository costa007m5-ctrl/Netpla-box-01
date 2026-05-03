const base = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export function apiUrl(path: string): string {
  if (!path.startsWith("/")) path = "/" + path;
  return base + path;
}
