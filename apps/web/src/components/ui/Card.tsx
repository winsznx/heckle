import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={`border border-rule bg-paper shadow-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
