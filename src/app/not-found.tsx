import Link from "next/link";

import { Logo } from "@/components/brand";
import { Button, Card, CardBody } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-4xl items-center px-4 sm:px-6">
        <Link href="/" className="rounded-md">
          <Logo />
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md">
          <CardBody className="space-y-4 text-center">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-brand-600">
              404
            </p>
            <h1 className="text-[20px] font-semibold tracking-[-0.015em] text-slate-900">
              We couldn&rsquo;t find that page
            </h1>
            <p className="text-[13.5px] leading-relaxed text-slate-500">
              The classroom, session or report may have ended — or the link is
              out of date.
            </p>
            <div className="flex justify-center gap-2 pt-1">
              <Link href="/">
                <Button>Back to the start</Button>
              </Link>
              <Link href="/demo">
                <Button variant="secondary">Open the demo</Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
