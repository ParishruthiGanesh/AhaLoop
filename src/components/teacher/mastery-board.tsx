"use client";

import { MASTERY_META, MasteryLegend, StageBadge } from "../mastery";
import { Card, CardBody, CardHeader, EmptyState, cn } from "../ui";
import type { MasteryRecord } from "@/lib/types";

/**
 * Where the loop closes for the teacher: the same students, later in the
 * cycle, with the misconception either still present or demonstrably gone.
 */
export function MasteryBoard({ mastery }: { mastery: MasteryRecord[] }) {
  const sorted = [...mastery].sort((a, b) => {
    const order = { red: 0, yellow: 1, green: 2, blue: 3 };
    return order[a.state] - order[b.state] || a.displayName.localeCompare(b.displayName);
  });

  const resolved = sorted.filter(
    (m) => m.stage === "resolved" || m.state === "blue",
  ).length;

  return (
    <Card>
      <CardHeader
        eyebrow="After class"
        title="Understanding by student"
        description="Updates as students work through diagnosis, repair, practice and teach-back."
        action={
          sorted.length > 0 ? (
            <span className="text-[12.5px] text-slate-500">
              <span className="font-semibold text-emerald-600">{resolved}</span>{" "}
              of {sorted.length} resolved
            </span>
          ) : null
        }
      />
      <CardBody className="space-y-4">
        {sorted.length === 0 ? (
          <EmptyState
            icon="📈"
            title="Nothing to show yet"
            description="Once students answer, their understanding of this concept appears here and moves as they work through their diagnosis."
          />
        ) : (
          <>
            <ul className="space-y-2">
              {sorted.map((record) => (
                <li
                  key={record.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-2.5 shrink-0 rounded-full",
                        MASTERY_META[record.state].dot,
                      )}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-slate-900">
                        {record.displayName}
                      </p>
                      <p className="truncate text-[11.5px] text-slate-500">
                        {MASTERY_META[record.state].meaning}
                      </p>
                    </div>
                  </div>
                  <StageBadge stage={record.stage} />
                </li>
              ))}
            </ul>
            <MasteryLegend />
          </>
        )}
      </CardBody>
    </Card>
  );
}
