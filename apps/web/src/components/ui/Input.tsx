import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...rest }: InputProps) {
  return (
    <input
      className={`w-full border border-rule bg-paper text-ink px-3 py-2 font-body placeholder:text-ink placeholder:opacity-40 focus:outline-none focus:border-2 ${className}`}
      {...rest}
    />
  );
}
