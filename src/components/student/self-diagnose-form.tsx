"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Field,
  Input,
  Textarea,
} from "../ui";
import { SAMPLE_CONCEPT } from "@/lib/lesson";

const EXAMPLE = "I think a model with 95% accuracy is always a good model.";

/**
 * "You don't need to know what you're confused about." The student writes
 * what they believe, and ConceptLens diagnoses the reasoning behind it.
 */
export function SelfDiagnoseForm({ sessionId }: { sessionId?: string }) {
  const router = useRouter();
  const [concept, setConcept] = useState(SAMPLE_CONCEPT);
  const [reasoning, setReasoning] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/analysis/diagnose", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reasoning, concept, sessionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not run the diagnosis.");
      router.push(`/student/lens/${data.diagnosis.id}`);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not run the diagnosis.",
      );
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow="ConceptLens"
        title="What are you stuck on?"
        description="Write what you think is true, in your own words. You don't have to know what the misconception is — that's the part this works out."
      />
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Topic" htmlFor="concept">
            <Input
              id="concept"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              maxLength={200}
              required
            />
          </Field>

          <Field
            label="What you currently think"
            htmlFor="reasoning"
            hint={
              <button
                type="button"
                onClick={() => setReasoning(EXAMPLE)}
                className="text-brand-600 hover:underline"
              >
                Use the example: &ldquo;{EXAMPLE}&rdquo;
              </button>
            }
          >
            <Textarea
              id="reasoning"
              rows={4}
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="I think…"
              maxLength={4000}
              required
            />
          </Field>

          {error ? <ErrorState message={error} /> : null}

          <Button
            type="submit"
            loading={busy}
            className="w-full"
            disabled={reasoning.trim().length < 5}
          >
            {busy ? "Reading your reasoning…" : "Diagnose my thinking"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
