/**
 * Fetch wrapper for the agency API.
 * Handles 401 redirects and JSON parsing.
 */
export async function api<T = unknown>(
  path: string,
  opts?: RequestInit
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...opts?.headers },
    ...opts,
  });

  if (res.status === 401) {
    window.location.href = "/auth/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(data.error || res.statusText);
  }

  return res.json();
}
