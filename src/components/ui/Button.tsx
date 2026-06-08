import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "cancel";
}

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  let btnClass = "btn";
  if (variant === "secondary") btnClass = "btn btn-secondary";
  else if (variant === "danger") btnClass = "btn btn-danger";
  else if (variant === "cancel") btnClass = "btn btn-cancel";
  else btnClass = "btn btn-submit"; // maps to primary/submit

  return (
    <button className={`${btnClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
