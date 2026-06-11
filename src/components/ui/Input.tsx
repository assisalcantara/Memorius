import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  requiredMark?: boolean;
}

export function formatCPF(value: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatTelefone(value: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function formatCEP(value: string): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
}

export function Input({ label, requiredMark, className = "", onChange, value, ...props }: InputProps) {
  const name = props.name || "";
  const type = props.type || "";

  // Apply formatting to controlled value
  let displayValue = value;
  if (typeof displayValue === "string") {
    if (name.toLowerCase() === "cpf") {
      displayValue = formatCPF(displayValue);
    } else if (name.toLowerCase() === "telefone" || name.toLowerCase() === "celular" || name.toLowerCase() === "admintelefone") {
      displayValue = formatTelefone(displayValue);
    } else if (name.toLowerCase() === "cep") {
      displayValue = formatCEP(displayValue);
    } else if (type === "email" || name.toLowerCase() === "email" || name.toLowerCase() === "adminemail") {
      displayValue = displayValue.toLowerCase().replace(/\s/g, "");
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onChange) return;
    let val = e.target.value;
    if (name.toLowerCase() === "cpf") {
      val = formatCPF(val);
    } else if (name.toLowerCase() === "telefone" || name.toLowerCase() === "celular" || name.toLowerCase() === "admintelefone") {
      val = formatTelefone(val);
    } else if (name.toLowerCase() === "cep") {
      val = formatCEP(val);
    } else if (type === "email" || name.toLowerCase() === "email" || name.toLowerCase() === "adminemail") {
      val = val.toLowerCase().replace(/\s/g, "");
    }
    e.target.value = val;
    onChange(e);
  };

  return (
    <div className="form-group">
      {label && (
        <label>
          {label}
          {requiredMark && <span className="required" style={{ color: "#d32f2f", marginLeft: "2px" }}>*</span>}
        </label>
      )}
      <input
        className={`auth-input ${className}`}
        value={displayValue}
        onChange={handleChange}
        {...props}
      />
    </div>
  );
}

