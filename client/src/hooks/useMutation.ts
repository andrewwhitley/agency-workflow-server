import { useState } from "react";
import { api } from "@/lib/api";

interface MutationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useMutation<T = unknown>(opts?: MutationOptions<T>) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function mutate(path: string, method: string, body?: unknown) {
    setIsPending(true);
    setError(null);
    try {
      const data = await api<T>(path, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      });
      opts?.onSuccess?.(data);
      return data;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      opts?.onError?.(e);
      throw e;
    } finally {
      setIsPending(false);
    }
  }

  return { mutate, isPending, error };
}
