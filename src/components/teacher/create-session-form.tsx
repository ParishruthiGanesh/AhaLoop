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
} from "../ui";

const SUGGESTED_TOPIC = "Accuracy, precision, recall and class imbalance";

export function CreateSessionForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the session.");
      router.push(`/teacher/session/${data.session.id}`);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not create the session.",
      );
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader
        eyebrow="New session"
        title="Start a live classroom"
        description="You'll get a six-character join code students can enter."
      />
      <CardBody>
        <form onSubmit={submit} className="space-y-4">
          <Field label="Session title" htmlFor="title">
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ML Evaluation — Week 6"
              maxLength={140}
              required
            />
          </Field>

          <Field
            label="Topic"
            htmlFor="topic"
            hint={
              <button
                type="button"
                onClick={() => setTopic(SUGGESTED_TOPIC)}
                className="text-brand-600 hover:underline"
              >
                Use the sample lesson
              </button>
            }
          >
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={SUGGESTED_TOPIC}
              maxLength={200}
              required
            />
          </Field>

          {error ? <ErrorState message={error} /> : null}

          <Button type="submit" loading={busy} className="w-full">
            {busy ? "Creating…" : "Create session"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
