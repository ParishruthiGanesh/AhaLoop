"use client";

import { useCallback, useEffect, useState } from "react";

import { SourceTag } from "../mastery";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Input,
  LoadingBlock,
  cn,
} from "../ui";
import type { Explanation, ExplanationStyle } from "@/lib/types";

const STYLES: { key: ExplanationStyle; label: string; hint: string }[] = [
  { key: "simple", label: "Simple language", hint: "Everyday words, short sentences" },
  { key: "technical", label: "Technical", hint: "Formulas and precise terms" },
  { key: "step-by-step", label: "Step by step", hint: "An ordered procedure" },
  { key: "visual", label: "Visual / low text", hint: "Almost no prose" },
  { key: "analogy", label: "Real-world analogy", hint: "One sustained comparison" },
];

const SUGGESTED_LANGUAGES = [
  "English",
  "Telugu",
  "Kannada",
  "Hindi",
  "Spanish",
  "French",
];

type ExplanationResult = Explanation & { languageUnavailable?: boolean };

/**
 * Stage 4a — Explain My Way.
 * The accessibility and personalisation layer: same concept, the form and
 * language the student actually reads in.
 */
export function ExplainMyWay({
  concept,
  misconception,
}: {
  concept: string;
  misconception: string;
}) {
  const [style, setStyle] = useState<ExplanationStyle>("simple");
  const [language, setLanguage] = useState("English");
  const [keepTerms, setKeepTerms] = useState(true);
  const [explanation, setExplanation] = useState<ExplanationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const load = useCallback(
    async (nextStyle: ExplanationStyle, nextLanguage: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/analysis/explain", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            concept,
            misconception,
            style: nextStyle,
            language: nextLanguage,
            keepTechnicalTermsInEnglish: keepTerms,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load the explanation.");
        setExplanation(data.explanation);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not load the explanation.",
        );
      } finally {
        setLoading(false);
      }
    },
    [concept, misconception, keepTerms],
  );

  useEffect(() => {
    void load("simple", "English");
    // Load once on mount; every later change is driven by an explicit action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function speak() {
    if (!explanation || typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(explanation.body.join(" "));
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(utterance);
    setSpeaking(true);
  }

  useEffect(
    () => () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    },
    [],
  );

  return (
    <Card>
      <CardHeader
        eyebrow="Explain My Way"
        title="Read it the way that works for you"
        description="Same concept, different form. Change the style or the language and it is rewritten, not just restyled."
        action={explanation ? <SourceTag source={explanation.generatedBy} /> : null}
      />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {STYLES.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setStyle(option.key);
                void load(option.key, language);
              }}
              aria-pressed={style === option.key}
              title={option.hint}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                style === option.key
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
          <div className="min-w-[12rem] flex-1">
            <label
              htmlFor="language"
              className="block text-[12px] font-medium text-slate-700"
            >
              Language
            </label>
            <Input
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              list="language-suggestions"
              className="mt-1"
              maxLength={40}
            />
            <datalist id="language-suggestions">
              {SUGGESTED_LANGUAGES.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <label className="flex items-center gap-2 pb-2 text-[12.5px] text-slate-600">
            <input
              type="checkbox"
              checked={keepTerms}
              onChange={(e) => setKeepTerms(e.target.checked)}
              className="size-4 rounded accent-brand-600"
            />
            Keep technical terms in English
          </label>

          <Button
            size="sm"
            className="mb-1"
            loading={loading}
            onClick={() => void load(style, language)}
          >
            Rewrite
          </Button>
        </div>

        {error ? (
          <ErrorState message={error} onRetry={() => void load(style, language)} />
        ) : null}

        {loading && !explanation ? (
          <LoadingBlock label="Rewriting the explanation…" />
        ) : null}

        {explanation ? (
          <article className={cn("animate-fade space-y-4", loading && "opacity-60")}>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold text-slate-900">
                {explanation.title}
              </h3>
              <Badge tone="brand">{explanation.language}</Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={speak}
                aria-pressed={speaking}
              >
                {speaking ? "◼ Stop" : "▶ Read aloud"}
              </Button>
            </div>

            {explanation.languageUnavailable ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-relaxed text-amber-900">
                Live translation needs a language-model key. Without one, this
                build ships curated translations for{" "}
                {SUGGESTED_LANGUAGES.slice(1).join(", ")} only — so the English
                version is shown here rather than a machine-mangled one.
              </div>
            ) : null}

            {explanation.style === "visual" ? (
              <VisualExplanation explanation={explanation} />
            ) : explanation.style === "step-by-step" ? (
              <ol className="space-y-2.5">
                {explanation.body.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-brand-100 text-[11.5px] font-semibold text-brand-700">
                      {index + 1}
                    </span>
                    <p className="text-[14px] leading-relaxed text-slate-800">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="space-y-2.5">
                {explanation.body.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="text-[14px] leading-relaxed text-slate-800"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {explanation.keyTerms.length > 0 ? (
              <dl className="grid gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 sm:grid-cols-2">
                {explanation.keyTerms.map((term) => (
                  <div key={term.term}>
                    <dt className="text-[12.5px] font-semibold text-slate-900">
                      {term.term}
                    </dt>
                    <dd className="text-[12.5px] leading-snug text-slate-600">
                      {term.meaning}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </article>
        ) : null}
      </CardBody>
    </Card>
  );
}

/** Low-text mode: the argument carried by labelled blocks, not prose. */
function VisualExplanation({ explanation }: { explanation: Explanation }) {
  return (
    <div className="space-y-3">
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {explanation.visual.map((block, index) => (
          <li
            key={block.label}
            className={cn(
              "rounded-xl border px-4 py-3.5",
              index === explanation.visual.length - 1
                ? "border-rose-200 bg-rose-50"
                : "border-slate-200 bg-white",
            )}
          >
            <div className="font-mono text-[19px] font-semibold tracking-[-0.02em] text-slate-900">
              {block.label}
            </div>
            <div className="mt-0.5 text-[12px] leading-snug text-slate-600">
              {block.detail}
            </div>
          </li>
        ))}
      </ol>
      <ul className="space-y-1">
        {explanation.body.map((line) => (
          <li key={line} className="text-[14px] font-medium text-slate-800">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
