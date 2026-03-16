import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface SeoClient {
  slug: string;
  name: string;
  domain?: string;
}

export function useClientSelector() {
  const [clients, setClients] = useState<SeoClient[]>([]);
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ slug: string; name: string; domain?: string }[]>("/content-management/clients")
      .then((data) => {
        const mapped = data.map((c) => ({ slug: c.slug, name: c.name, domain: (c as any).domain }));
        setClients(mapped);
        if (mapped.length > 0 && !slug) setSlug(mapped[0].slug);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const client = clients.find((c) => c.slug === slug);

  return { clients, slug, setSlug, client, loading };
}
