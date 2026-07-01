interface IconProps {
  className?: string;
}

/** Arrow-out-of-box — external destination (chainscan). */
export function IconExternal({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
      className={className}
    >
      <path d="M7 3H3v10h10V9" strokeLinecap="square" />
      <path d="M9.5 3H13v3.5M13 3 7.5 8.5" strokeLinecap="square" />
    </svg>
  );
}

/** Boxed grid — an on-network 0G Storage blob (internal /storage route). */
export function IconStorage({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
      className={className}
    >
      <rect x="3" y="3" width="10" height="10" />
      <path d="M3 8h10M8 3v10" />
    </svg>
  );
}
