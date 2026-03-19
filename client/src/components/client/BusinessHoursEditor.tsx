import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

type BusinessHours = Record<string, DayHours>;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const DEFAULT_HOURS: DayHours = { open: "09:00", close: "17:00", closed: false };

function parseHours(value: unknown): BusinessHours {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const result: BusinessHours = {};
    for (const day of DAYS) {
      const d = obj[day] as Partial<DayHours> | undefined;
      result[day] = {
        open: d?.open || "09:00",
        close: d?.close || "17:00",
        closed: d?.closed ?? false,
      };
    }
    return result;
  }
  const result: BusinessHours = {};
  for (const day of DAYS) {
    result[day] = { ...DEFAULT_HOURS };
  }
  return result;
}

export function BusinessHoursEditor({ value, onChange }: { value: unknown; onChange: (val: BusinessHours) => void }) {
  const [hours, setHours] = useState<BusinessHours>(() => parseHours(value));

  useEffect(() => {
    setHours(parseHours(value));
  }, [value]);

  const update = (day: string, field: keyof DayHours, val: string | boolean) => {
    const next = { ...hours, [day]: { ...hours[day], [field]: val } };
    setHours(next);
    onChange(next);
  };

  const copyToAll = () => {
    const monday = hours["Monday"];
    const next: BusinessHours = {};
    for (const day of DAYS) {
      next[day] = { ...monday };
    }
    setHours(next);
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Business Hours</Label>
        <Button type="button" size="sm" variant="ghost" onClick={copyToAll} className="text-xs">
          Copy Monday to all
        </Button>
      </div>
      {DAYS.map((day) => (
        <div key={day} className="flex items-center gap-3">
          <span className="text-sm w-24 shrink-0">{day}</span>
          <div className="flex items-center gap-1.5">
            <Checkbox checked={hours[day].closed} onCheckedChange={(v) => update(day, "closed", !!v)} />
            <span className="text-xs text-muted">Closed</span>
          </div>
          {!hours[day].closed && (
            <>
              <Input type="time" value={hours[day].open} onChange={(e) => update(day, "open", e.target.value)} className="w-28 h-8 text-sm" />
              <span className="text-xs text-muted">to</span>
              <Input type="time" value={hours[day].close} onChange={(e) => update(day, "close", e.target.value)} className="w-28 h-8 text-sm" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
