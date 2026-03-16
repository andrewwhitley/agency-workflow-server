interface Client {
  slug: string;
  name: string;
}

export function ClientSelector({
  clients,
  value,
  onChange,
}: {
  clients: Client[];
  value: string;
  onChange: (slug: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-md border border-border bg-surface text-foreground text-sm"
    >
      {clients.map((c) => (
        <option key={c.slug} value={c.slug}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
