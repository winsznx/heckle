import type { TextareaHTMLAttributes } from "react";

interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "maxLength"> {
  maxLength?: number;
}

export function Textarea({
  className = "",
  maxLength = 280,
  ...rest
}: TextareaProps) {
  return (
    <textarea
      maxLength={maxLength}
      className={`w-full border border-rule bg-paper text-ink px-3 py-2 font-body placeholder:text-ink placeholder:opacity-40 focus:outline-none focus:border-2 resize-none ${className}`}
      {...rest}
    />
  );
}
