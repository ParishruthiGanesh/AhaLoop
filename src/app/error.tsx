"use client";

import { useEffect } from "react";

import { Button, Card, CardBody } from "@/components/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[thinktrace] render error:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardBody className="space-y-4">
          <h1 className="text-[19px] font-semibold tracking-[-0.015em] text-slate-900">
            Something went wrong
          </h1>
          <p className="text-[13.5px] leading-relaxed text-slate-500">
            {error.message ||
              "An unexpected error interrupted this screen. Trying again usually clears it."}
          </p>
          <div className="flex gap-2">
            <Button onClick={reset}>Try again</Button>
            <Button
              variant="secondary"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              Back to the start
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
