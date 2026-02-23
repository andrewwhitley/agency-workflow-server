/**
 * Secret redaction utility.
 * Strips sensitive fields and values from objects before they reach the browser.
 */

const SENSITIVE_KEYS =
  /token|secret|key|password|cookie|oauth|authorization|bearer|credential|private_key|client_secret|refresh_token|access_token|api_key|apikey|webhook/i;

const BASE64_OR_LONG_RANDOM =
  /^[A-Za-z0-9+/=_-]{40,}$/;

const REDACTED = "[REDACTED]";

/**
 * Deep-clone an object and redact sensitive fields.
 * - Keys matching SENSITIVE_KEYS have their values replaced with "[REDACTED]"
 * - String values that look like long tokens/base64 are masked
 * - Works recursively on nested objects and arrays
 */
export function redact<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    // Mask strings that look like tokens/keys (long random or base64)
    if (BASE64_OR_LONG_RANDOM.test(data) && data.length >= 40) {
      return REDACTED as T;
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redact(item)) as T;
  }

  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.test(key)) {
        result[key] = REDACTED;
      } else {
        result[key] = redact(value);
      }
    }
    return result as T;
  }

  return data;
}

/**
 * Express middleware that wraps res.json() to automatically redact sensitive data.
 */
export function redactionMiddleware(
  _req: unknown,
  res: { json: (body: unknown) => unknown; _originalJson?: (body: unknown) => unknown },
  next: () => void
): void {
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    return originalJson(redact(body));
  };
  next();
}
