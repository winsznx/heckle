"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Reset scroll to the top on every route change. Next's App Router doesn't
 *  reliably do this when the destination renders its content asynchronously,
 *  which is why some pages appeared to land near the footer. */
export function ScrollToTop() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
