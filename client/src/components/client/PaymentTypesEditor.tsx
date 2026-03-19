import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PaymentTypes {
  types: string[];
  other: string;
}

const COMMON_TYPES = [
  "Cash",
  "Credit Card",
  "Debit Card",
  "HSA/FSA",
  "Insurance",
  "Check",
  "CareCredit",
  "Financing",
];

function parsePaymentTypes(value: unknown): PaymentTypes {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    return {
      types: Array.isArray(obj.types) ? (obj.types as string[]) : [],
      other: typeof obj.other === "string" ? obj.other : "",
    };
  }
  return { types: [], other: "" };
}

export function PaymentTypesEditor({ value, onChange }: { value: unknown; onChange: (val: PaymentTypes) => void }) {
  const [data, setData] = useState<PaymentTypes>(() => parsePaymentTypes(value));

  useEffect(() => {
    setData(parsePaymentTypes(value));
  }, [value]);

  const toggle = (type: string) => {
    const next = data.types.includes(type)
      ? { ...data, types: data.types.filter((t) => t !== type) }
      : { ...data, types: [...data.types, type] };
    setData(next);
    onChange(next);
  };

  const setOther = (other: string) => {
    const next = { ...data, other };
    setData(next);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Payment Types Accepted</Label>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {COMMON_TYPES.map((type) => (
          <div key={type} className="flex items-center gap-2">
            <Checkbox checked={data.types.includes(type)} onCheckedChange={() => toggle(type)} />
            <span className="text-sm">{type}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted">Other</Label>
        <Input value={data.other} onChange={(e) => setOther(e.target.value)} placeholder="Other payment types..." className="h-8 text-sm" />
      </div>
    </div>
  );
}
