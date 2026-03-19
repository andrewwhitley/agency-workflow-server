import { useId } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface BaseProps {
  label: string;
  required?: boolean;
}

interface TextFieldProps extends BaseProps {
  type?: "text" | "number" | "email" | "url";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

interface TextareaFieldProps extends BaseProps {
  type: "textarea";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

interface CheckboxFieldProps extends BaseProps {
  type: "checkbox";
  checked: boolean;
  onChange: (checked: boolean) => void;
}

interface SelectFieldProps extends BaseProps {
  type: "select";
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

type FormFieldProps = TextFieldProps | TextareaFieldProps | CheckboxFieldProps | SelectFieldProps;

export function FormField(props: FormFieldProps) {
  const reactId = useId();
  const id = reactId;

  if (props.type === "checkbox") {
    return (
      <div className="flex items-center gap-2">
        <Checkbox id={id} checked={props.checked} onCheckedChange={props.onChange} />
        <Label htmlFor={id} className="text-sm">{props.label}</Label>
      </div>
    );
  }

  if (props.type === "select") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{props.label}{props.required && <span className="text-destructive ml-1">*</span>}</Label>
        <select id={id} value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          {props.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (props.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{props.label}{props.required && <span className="text-destructive ml-1">*</span>}</Label>
        <Textarea id={id} value={props.value} onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder} rows={props.rows || 3} />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{props.label}{props.required && <span className="text-destructive ml-1">*</span>}</Label>
      <Input id={id} type={props.type || "text"} value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder} required={props.required} />
    </div>
  );
}
