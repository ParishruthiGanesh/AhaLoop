import { Spinner } from "@/components/ui";

export default function Loading() {
  return (
    <div className="flex min-h-[60dvh] items-center justify-center">
      <div className="flex items-center gap-3 text-[13.5px] text-slate-500">
        <Spinner className="size-4 text-brand-600" />
        Loading…
      </div>
    </div>
  );
}
