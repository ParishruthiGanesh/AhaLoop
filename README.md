# ThinkTrace AI

**Don't just mark the wrong answer. Understand the thinking behind it.**

ThinkTrace AI shows a teacher how their whole class is confused, diagnoses why
each individual student is confused, and keeps teaching until the misconception
is demonstrably gone.

The point is not that it bundles a tutor, a quiz generator and a polling tool.
It is that classroom-level confusion and individual-level diagnosis are **one
loop**, and the loop does not close until the student can explain the concept in
their own words without the original misconception in it.

```
Teacher asks a question
        ↓
LecturePulse  ── how the class is confused
        ↓
ConceptLens  ── why this student is confused
        ↓
Prerequisite Detective  ── what is actually missing
        ↓
ErrorTwin  ── does the reasoning error repeat?
        ↓
Explain My Way / PerspectiveLab  ── another form, another voice
        ↓
Teach-back verification  ── has it actually gone?
        ↓
   resolved ──→ teacher dashboard updates
   not yet  ──→ back to ConceptLens
```

---

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000> and click **Open the seeded demo**.

**No API keys are required.** With no configuration the app runs in demo mode —
an in-memory store plus a deterministic analyzer — and every feature below is
fully usable. Every screen states which backend produced what you are reading.

### The two-minute walkthrough

1. Go to `/demo` and choose **Enter as the teacher**.
   You land in a live classroom, `ML Evaluation — Week 6`, with a join code and
   five students who have already answered.
2. Press **Analyse responses**. The confusion map groups the class by the kind
   of reasoning behind each answer and gives you an intervention, a
   counterexample and a follow-up question.
3. Open a second browser (or a private window), go to `/demo` and choose
   **Enter as a student**. You are Aarav Menon, who answered incorrectly.
4. Press **Why was this wrong? Open ConceptLens** and walk the five stages:
   diagnosis → prerequisite repair → ErrorTwin practice → other explanations →
   teach-back.
5. Submit a teach-back that names the class imbalance, the do-nothing baseline
   and recall. Return to the teacher window: Aarav has moved to **Resolved**.

To answer as yourself instead, sign up as a student and join with the code on
the teacher's screen.

---

## Features

### Teacher — LecturePulse

| | |
|---|---|
| **Live classrooms** | Create a session, get a six-character join code, go live |
| **Question composer** | Multiple-choice or open-ended, with an optional anonymous mode |
| **Live response feed** | Answers *and* the student's written reasoning, as they arrive |
| **Confusion map** | Students grouped by reasoning, not by which option they ticked |
| **Prerequisite gaps** | Ranked by how many students need each one |
| **Intervention** | A two-minute explanation, a counterexample, a follow-up question |
| **Understanding board** | Every student's mastery state, updating as they work |

The grouping is the interesting part: two students who chose different options
for the same underlying reason land in the same group, and two who chose the
same option for different reasons do not.

### Student — ConceptLens

| | |
|---|---|
| **Misconception diagnosis** | The belief behind the answer, why it fails, a counterexample, a confidence score |
| **Student verdict** | Confirm, reject or flag the diagnosis as unclear — rejecting it stops the cycle rather than practising against the wrong premise |
| **Prerequisite Detective** | The shortest repair path through the concept graph: two or three short concepts, foundation first |
| **ErrorTwin** | Practice built around the *reasoning pattern* — a similar case, the same trap in a new domain, then a transfer question. Generated for the student's own topic when a model key is set; a vetted question bank is the fallback |
| **Explain My Way** | Simple, technical, step-by-step, low-text visual or analogy — in another language (Telugu, Kannada, Hindi and more, or anything you type with a model key), optionally keeping technical terms in English. Read-aloud via the browser speech API |
| **PerspectiveLab** | The same concept from a physician, a security analyst, an examiner, a data scientist and an everyday analogy |
| **Teach-back** | The student explains it in their own words; the evaluation decides whether the original misconception is gone |

### Mastery ladder

| State | Meaning |
|---|---|
| 🔴 Red | The misconception is still driving the reasoning |
| 🟡 Yellow | Correct answer, uncertain reasoning |
| 🟢 Green | Understands the concept and can transfer it |
| 🔵 Blue | Can explain it to someone else |

The state only advances on evidence: finishing the ErrorTwin set with a mistake
still in it leaves you at yellow, and only a teach-back that survives the
misconception check reaches blue.

---

## Environment configuration

Copy `.env.example` to `.env.local`. Every variable is optional.

```bash
cp .env.example .env.local
```

| Variable | Effect when set |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Real accounts, persistence and Realtime responses |
| `ANTHROPIC_API_KEY` **or** `OPENAI_API_KEY` | Live misconception analysis instead of the demo analyzer |
| `ANTHROPIC_MODEL` / `OPENAI_MODEL` | Override the default model (Claude Opus 5) |
| `ANTHROPIC_EFFORT` | `low`…`max`; default `medium`, tuned for interactive latency |
| `LLM_TIMEOUT_MS` | Abort a slow analysis call and fall back (default 60000) |

Model keys are read in a single `server-only` module and never reach the
browser. The Supabase keys are public by design — the anon key is protected by
the row-level security policies in `supabase/schema.sql`.

The two are independent: Supabase without a model key, or a model key without
Supabase, both work.

### Setting up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/schema.sql`. It creates the tables,
   the sign-up trigger that copies the chosen role into `profiles`, the
   Realtime publication and the RLS policies.
3. Copy the project URL and anon key from **Settings → API** into `.env.local`.
4. For a frictionless demo, turn off email confirmation under
   **Authentication → Providers → Email**.

Restart the dev server. The badge in the header changes from *Demo mode* to
*Connected*.

---

## Deploying

Demo mode holds its data in the server's memory. That is fine for one local
process and **wrong for a serverless host**: on Vercel or Netlify each request
may hit a different instance, so a classroom created on one is invisible to the
join-code lookup on another. It fails intermittently rather than outright,
which is the worst way to discover it. A production build without Supabase
logs a warning at startup saying exactly this.

**So a live deployment needs Supabase.** It takes about fifteen minutes.

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste all of `supabase/schema.sql` → **Run**. The file is
   idempotent, so re-running it is safe.
3. **Authentication → Providers → Email** → turn *off* "Confirm email", so
   anyone trying your deployment can sign up without waiting for a link.
4. **Settings → API** → copy the Project URL and the `anon` public key.

### 2. Vercel

1. Import the GitHub repository and pick this branch.
2. Add environment variables:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from Supabase → Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the `anon` public key |
   | `ANTHROPIC_API_KEY` | your Claude API key |

3. Deploy. The header badge should read **Connected** rather than *Demo mode*.

Next.js is auto-detected; no build settings to change.

### What changes in connected mode

- Sign-up and sign-in are real Supabase Auth. The passwordless demo identity is
  disabled, so there is no way around authentication.
- `/demo` no longer switches who you are. Sign in as a teacher first, and
  seeding then builds the sample classroom under your own account.
- Responses arrive over Supabase Realtime as well as polling.
- Resetting demo data is unavailable — it only ever cleared memory.

### Security notes

The `anon` key is meant to be public; row-level security is what protects the
data, and `supabase/schema.sql` enables it on every table. The policies were
verified against a real Postgres: a signed-in user who is neither the teacher
nor a participant sees zero sessions, zero questions, zero responses and zero
participants, and cannot submit an answer as somebody else.

Join codes are resolved through a `security definer` function that returns one
session for one exact code, rather than a readable `sessions` table — otherwise
any signed-in user could list every classroom and its code and walk into any
lesson.

---

## Architecture

```
src/
  app/
    page.tsx                     landing
    about/ demo/ login/ signup/
    join/                        student enters a join code
    teacher/                     classroom list
      session/[id]/              live control room
    student/                     student home
      session/[id]/              answer the live question
      lens/[id]/                 the five-stage ConceptLens journey
    api/
      auth/{demo,supabase,signout}
      sessions/  questions/  responses/  live/[sessionId]/
      analysis/{confusion-map,diagnose,explain,perspectives,practice,teachback,feedback}
      demo/{seed,reset}   mode/
  components/
    ui.tsx                       primitives: Card, Button, Field, states…
    app-shell.tsx  brand.tsx  mastery.tsx  cycle-diagram.tsx
    teacher/                     join code, composer, feed, confusion map, board
    student/                     join form, answer panel, self-diagnosis
    lens/                        diagnosis, repair path, ErrorTwin, Explain My
                                 Way, PerspectiveLab, teach-back, journey
  hooks/use-live-session.ts      polling + Supabase Realtime
  lib/
    types.ts                     the whole domain model
    lesson.ts                    sample lesson, misconception catalogue,
                                 prerequisite graph, seeded students
    errortwin-bank.ts            vetted practice questions per misconception
    ai/llm.ts                    structured-output client (Anthropic / OpenAI)
    ai/analysis.ts               the five analysis entry points
    ai/demo-analyzer.ts          deterministic fallback analyzer
    store/{types,demo-store,supabase-store}.ts
    supabase/{server,client}.ts  auth.ts  config.ts  api.ts
supabase/schema.sql
```

### Two backends behind one interface

`lib/store/types.ts` defines a `Store` contract. `DemoStore` implements it in
memory; `SupabaseStore` implements it against Postgres. `getStore()` picks one
per request. No route or component knows which is in use — demo mode is the
same application, not a mock of it.

The same pattern covers analysis. Each entry point in `lib/ai/analysis.ts`
asks the model for a JSON object, **validates it**, and falls back to
`demo-analyzer.ts` if anything is missing or the call fails. Callers always
receive a complete, well-formed result, tagged `generatedBy: "llm" | "demo"` —
which is what the small *AI analysis* / *Demo analyzer* label on screen reads.

### The demo analyzer is not a script

It reads each student's actual words and scores them against a misconception
catalogue with per-profile signal matching, then derives confidence from signal
strength *and* separation from the runner-up, so an ambiguous answer reports
lower confidence — and when nothing matches at all, it says so instead of
guessing. Repair paths are computed by walking the prerequisite graph
backwards and ordering by depth. It only knows the sample lesson's catalogue —
that is exactly what the *Demo analyzer* label tells the user.

### Real-time

`useLiveSession` polls `/api/live/[sessionId]` on a 3-second interval in both
modes, and additionally subscribes to Supabase Realtime `postgres_changes` when
Supabase is configured, so responses land instantly. Snapshots carry a
`revision` and the hook skips the state update when it hasn't changed, so the
dashboard doesn't re-render on every poll.

### Data model

`profiles · sessions · participants · questions · responses · confusion_maps ·
diagnoses · practice_attempts · teach_backs · mastery`

Analysis artefacts are stored as JSONB payloads so the AI contract can evolve
without a migration per field. RLS restricts every table to the session's
teacher and its participants; join codes are the access control for resolving
a classroom.

### Structured AI output

Every analysis call is schema-constrained — a forced tool call on Anthropic,
`json_schema` response format on OpenAI. For example, a diagnosis returns:

```json
{
  "misconception": "A high accuracy score always means the model is good…",
  "whyReasoningFails": "Accuracy is the share of all predictions that are correct…",
  "counterexample": "Take 10,000 transactions, 100 of them fraudulent…",
  "missingPrerequisites": ["class imbalance", "confusion matrix", "false negatives"],
  "confidence": 0.91,
  "errorPattern": "Selecting a metric before checking the class distribution",
  "errorPatternDescription": "Your ErrorTwin reaches for the headline number first…"
}
```

---

## The sample lesson

**Accuracy, precision, recall and class imbalance.** The seeded classroom asks:

> A fraud-detection model reports 95% accuracy on a dataset where 1% of
> transactions are fraudulent. Is this a good model? Explain your reasoning.

Five simulated students answer with deliberately different reasoning, producing
five distinct groups: accuracy read as overall quality, precision and recall
confused, formula known but application unclear, quality attributed to the
algorithm, and correct understanding.

Those five students and their answers are **demonstration data**, and every
screen that shows them says so. No statistic anywhere in the app is fabricated:
counts and percentages are computed from the responses actually in the store.

---

## Commands

```bash
npm run dev        # development server
npm run build      # production build
npm run start      # serve the production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Tech stack

Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 ·
Supabase (Auth, Postgres, Realtime) · Claude (Opus 5 by default) or OpenAI,
with structured JSON output.

**When a model call fails**, the screen says so and quotes the provider's own
error — an exhausted credit balance, a revoked key, a timeout — rather than
telling you to set a key you have already set. No UI component library — the primitives in `components/ui.tsx` are
about 400 lines and carry the whole design system.

## Scope

This is a hackathon MVP. It implements one complete end-to-end journey rather
than a shallow version of every feature in the product vision. Known limits:

- **The demo analyzer covers the sample lesson only.** Everything structural
  works on any subject without a key — creating classrooms and join codes,
  writing your own questions, students joining and typing their own answers
  and reasoning, the live response feed. What needs the sample lesson (or a
  model key) is the *analysis*: misconception diagnosis, confusion-map
  grouping, the prerequisite repair path, ErrorTwin practice, Explain My Way
  and PerspectiveLab.

  On another topic without a key, each of those says so rather than serving
  the wrong subject: diagnosis reports "no confident diagnosis" and names the
  missing key, unmatched answers get their own *Not classified* group on the
  confusion map, Explain My Way returns "Not available without a model key",
  PerspectiveLab shows an empty state, and teach-back declines to score rather
  than marking your answer against the wrong rubric.

  **With a model key, all of it works on any topic** — including the
  prerequisite repair path and the three ErrorTwin practice questions, which
  are generated for the student's own subject and validated (every item needs
  at least two distinct options and a correct id among them) before they are
  shown. The built-in graph and question bank remain as fallbacks.
- Without a model key, translation ships as curated text for Telugu, Kannada,
  Hindi, Spanish and French; any other language is reported as unavailable
  rather than silently returning English. With a key, type any language.
- Video recommendations are curated links, not retrieved and relevance-checked.
- Demo-mode data lives in the server's memory and resets on restart.
