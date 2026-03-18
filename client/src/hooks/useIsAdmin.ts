import { useEffect, useState } from "react";
import { api } from "@/lib/api";

let cachedResult: boolean | null = null;

export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean>(cachedResult ?? false);
  const [loading, setLoading] = useState(cachedResult === null);

  useEffect(() => {
    if (cachedResult !== null) return;
    api<{ admin: boolean }>("/eos/role")
      .then((data) => {
        cachedResult = data.admin;
        setIsAdmin(data.admin);
      })
      .catch(() => {
        cachedResult = false;
        setIsAdmin(false);
      })
      .finally(() => setLoading(false));
  }, []);

  return { isAdmin, loading };
}
