import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface User {
  name: string;
  email: string;
  picture: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ authenticated: boolean; user?: User }>("/auth/me")
      .then((data) => {
        if (data.authenticated && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        // 401 handled by api() — redirects to login
      })
      .finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
