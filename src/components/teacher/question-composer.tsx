"use client";

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
  cn,
} from "../ui";
import {
  SAMPLE_CONCEPT,
  SAMPLE_CORRECT_OPTION_ID,
  SAMPLE_OPTIONS,
  SAMPLE_QUESTION_PROMPT,
} from "@/lib/lesson";
import type { QuestionType } from "@/lib/types";

const LETTERS = ["a", "b", "c", "d", "e"];

export function QuestionComposer({
  sessionId,
  defaultConcept,
  onCreated,
}: {
  sessionId: string;
  defaultConcept: string;
  onCreated: () => Promise<void> | void;
}) {
  const [type, setType] = useState<QuestionType>("mcq");
  const [prompt, setPrompt] = useState("");
  const [concept, setConcept] = useState(defaultConcept);
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correct, setCorrect] = useState("a");
  const [allowAnonymous, setAllowAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadSample() {
    setType("mcq");
    setPrompt(SAMPLE_QUESTION_PROMPT);
    setConcept(SAMPLE_CONCEPT);
    setOptions(SAMPLE_OPTIONS.map((o) => o.text));
    setCorrect(SAMPLE_CORRECT_OPTION_ID);
    setError(null);
  }

  async function submit(publish: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          prompt,
          concept,
          type,
          allowAnonymous,
          publish,
          options: options
            .map((text, index) => ({ id: LETTERS[index], text }))
            .filter((o) => o.text.trim().length > 0),
          correctOptionId: type === "mcq" ? correct : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the question.");

      setPrompt("");
      setOptions(["", "", "", ""]);
      setCorrect("a");
      await onCreated();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not create the question.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Ask the class"
        title="New question"
        description="Students always give their reasoning as well as their answer — that written reasoning is what the analysis reads."
        action={
          <Button variant="ghost" size="sm" onClick={loadSample}>
            Load sample question
          </Button>
        }
      />
      <CardBody className="space-y-4">
        <div className="flex gap-2">
          {(["mcq", "open"] as QuestionType[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setType(option)}
              aria-pressed={type === option}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors",
                type === option
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400",
              )}
            >
              {option === "mcq" ? "Multiple choice" : "Open ended"}
            </button>
          ))}
        </div>

        <Field label="Question" htmlFor="prompt">
          <Textarea
            id="prompt"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A fraud-detection model reports 95% accuracy on a dataset where 1% of transactions are fraudulent. Is this a good model?"
            maxLength={2000}
          />
        </Field>

        <Field
          label="Concept under test"
          htmlFor="concept"
          hint="Used to track mastery and to find the prerequisite gaps."
        >
          <Input
            id="concept"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            maxLength={200}
          />
        </Field>

        {type === "mcq" ? (
          <fieldset className="space-y-2">
            <legend className="mb-1 text-[13px] font-medium text-slate-700">
              Options — select the correct one
            </legend>
            {options.map((value, index) => (
              <div key={LETTERS[index]} className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="correct"
                  value={LETTERS[index]}
                  checked={correct === LETTERS[index]}
                  onChange={() => setCorrect(LETTERS[index])}
                  aria-label={`Mark option ${LETTERS[index].toUpperCase()} correct`}
                  className="size-4 accent-brand-600"
                />
                <span className="w-4 text-[12px] font-semibold uppercase text-slate-400">
                  {LETTERS[index]}
                </span>
                <Input
                  value={value}
                  onChange={(e) => {
                    const next = [...options];
                    next[index] = e.target.value;
                    setOptions(next);
                  }}
                  placeholder={`Option ${LETTERS[index].toUpperCase()}`}
                  maxLength={300}
                />
              </div>
            ))}
          </fieldset>
        ) : null}

        <label className="flex items-center gap-2.5 text-[13px] text-slate-600">
          <input
            type="checkbox"
            checked={allowAnonymous}
            onChange={(e) => setAllowAnonymous(e.target.checked)}
            className="size-4 rounded accent-brand-600"
          />
          Collect responses anonymously
          <span className="text-[12px] text-slate-400">
            (the confusion map still works; individual names are hidden)
          </span>
        </label>

        {error ? <ErrorState message={error} /> : null}

        <div className="flex flex-wrap gap-2">
          <Button loading={busy} onClick={() => submit(true)}>
            Publish to students
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => submit(false)}>
            Save as draft
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
