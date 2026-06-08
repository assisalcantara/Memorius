import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  requiredMark?: boolean;
}

export function Input({ label, requiredMark, className = "", ...props }: InputProps) {
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
        {...props}
      />
    </div>
  );
}

