"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="p-8 flex flex-col gap-4 items-start">
      <h2 className="font-display text-2xl font-black">Something broke</h2>
      <p className="font-body opacity-70 max-w-prose">{error.message}</p>
      <Button onClick={reset}>Try again</Button>
    </Card>
  );
}
