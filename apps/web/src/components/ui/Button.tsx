import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 border border-rule font-mono uppercase tracking-wide select-none transition-transform hover:-translate-y-px disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:border-2";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper",
  secondary: "bg-paper text-ink",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
