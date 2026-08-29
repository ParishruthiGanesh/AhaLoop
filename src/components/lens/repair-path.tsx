"use client";

import { useState } from "react";

import { Badge, Button, Card, CardBody, CardHeader, EmptyState, cn } from "../ui";
import type { PrerequisiteNode } from "@/lib/types";

/**
 * Stage 2 — Prerequisite Detective.
 * The point is the *shortest* path: not "revise the chapter", but the two or
 * three concepts underneath the misconception, deepest first.
 */
export function RepairPath({
  nodes,
  completed,
  onComplete,
}: {
  nodes: PrerequisiteNode[];
  completed: string[];
  onComplete: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(nodes[0]?.id ?? null);
  const [revealed, setRevealed] = useState<string[]>([]);

  if (nodes.length === 0) {
    return (
      <Card>
        <CardHeader
          eyebrow="Prerequisite Detective"
          title="Nothing missing underneath"
        />
        <CardBody>
          <EmptyState
            icon="✅"
            title="No prerequisite gap found"
            description="Your reasoning doesn't depend on an earlier concept you're missing — so go straight to the practice."
          />
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Prerequisite Detective"
        title="Your shortest repair path"
        description={`${nodes.length} short ${nodes.length === 1 ? "concept" : "concepts"} underneath this misconception, deepest first. A few minutes each — not the whole chapter.`}
        action={
          <Badge tone={completed.length === nodes.length ? "green" : "neutral"}>
            {completed.length}/{nodes.length} done
          </Badge>
        }
      />
      <CardBody>
        <ol className="space-y-2.5">
          {nodes.map((node, index) => {
            const isOpen = openId === node.id;
            const isDone = completed.includes(node.id);
            const showAnswer = revealed.includes(node.id);

            return (
              <li key={node.id}>
                <div
                  className={cn(
                    "rounded-xl border transition-colors",
                    isOpen
                      ? "border-brand-300 bg-brand-50/40"
                      : "border-slate-200 bg-white",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : node.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  >
                    <span
                      className={cn(
                        "grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                        isDone
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-slate-600",
                      )}
                    >
                      {isDone ? "✓" : index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-slate-900">
                        {node.concept}
                      </span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-slate-500">
                        {node.why}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "shrink-0 text-slate-400 transition-transform",
                        isOpen && "rotate-180",
                      )}
                    >
                      ▾
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="animate-fade space-y-3.5 border-t border-slate-200/70 px-4 py-4">
                      <section>
                        <h4 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                          One-minute explanation
                        </h4>
                        <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-800">
                          {node.explanation}
                        </p>
                      </section>

                      <section className="rounded-lg bg-white px-3.5 py-3 ring-1 ring-slate-200">
                        <h4 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-slate-500">
                          Worked example
                        </h4>
                        <p className="mt-1.5 font-mono text-[12.5px] leading-relaxed text-slate-700">
                          {node.example}
                        </p>
                      </section>

                      <section className="rounded-lg border border-amber-200 bg-amber-50/70 px-3.5 py-3">
                        <h4 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-amber-800">
                          Quick check
                        </h4>
                        <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-800">
                          {node.checkQuestion}
                        </p>
                        {showAnswer ? (
                          <p className="mt-2 text-[13px] font-medium text-emerald-700">
                            {node.checkAnswer}
                          </p>
                        ) : (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="mt-2.5"
                            onClick={() =>
                              setRevealed((prev) => [...prev, node.id])
                            }
                          >
                            Show the answer
                          </Button>
                        )}
                      </section>

                      {!isDone ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            onComplete(node.id);
                            const next = nodes[index + 1];
                            setOpenId(next ? next.id : null);
                          }}
                        >
                          Got it — mark as repaired
                        </Button>
                      ) : (
                        <p className="text-[12.5px] font-medium text-emerald-700">
                          ✓ Repaired
                        </p>
                      )}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}
