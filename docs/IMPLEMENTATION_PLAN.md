# ThinkTrace AI — MVP Implementation Plan

## Product principle
One learning cycle, not six tools:
Class confusion (LecturePulse) -> individual misconception (ConceptLens) ->
prerequisite repair -> ErrorTwin practice -> Explain My Way / PerspectiveLab ->
Teach-back verification -> teacher sees resolution.

## Phases
1. Scaffold: Next.js 15 (App Router) + TS + Tailwind v4. Design tokens, UI primitives.
2. Data layer: adapter interface with two backends — Supabase and in-memory Demo Mode.
3. Auth: Supabase Auth when configured; cookie-based demo identity otherwise.
4. Teacher: session create + join code, question compose/publish, live response feed.
5. AI layer: structured JSON contracts, LLM provider (Anthropic/OpenAI) + deterministic
   demo analyzer seeded for the accuracy/precision/recall lesson.
6. LecturePulse confusion map.
7. Student: join, answer, ConceptLens report.
8. Prerequisite Detective + ErrorTwin practice.
9. Explain My Way + PerspectiveLab.
10. Teach-back verification -> mastery state -> teacher dashboard reflects it.
11. Seed data, README, build/typecheck/lint, end-to-end walkthrough.

## Routes
| Route | Purpose |
|---|---|
| `/` | Landing + the learning-cycle story |
| `/login`, `/signup` | Auth with role selection (teacher / student) |
| `/teacher` | Session list + create |
| `/teacher/session/[id]` | Live control room: code, questions, live feed, confusion map, mastery |
| `/join` | Student enters join code |
| `/student` | Student home: live sessions + open diagnoses + mastery |
| `/student/session/[id]` | Answer the live question |
| `/student/lens/[diagnosisId]` | Full ConceptLens journey (5 stages) |
| `/demo` | One-click seeded demo launcher |

## API (all keys server-side only)
- `POST /api/auth/demo`, `POST /api/auth/signout`
- `GET|POST /api/sessions`, `GET /api/sessions/[id]`, `POST /api/sessions/[id]/status`
- `POST /api/sessions/join`
- `POST /api/questions`, `POST /api/questions/[id]/publish`, `POST /api/questions/generate`
- `POST /api/responses`
- `GET /api/live/[sessionId]` (poll snapshot; Supabase Realtime layers on top)
- `POST /api/analysis/confusion-map`
- `POST /api/analysis/diagnose`
- `POST /api/analysis/explain`
- `POST /api/analysis/perspectives`
- `POST /api/analysis/practice`
- `POST /api/analysis/teachback`

## Schema (Postgres / mirrored by demo store)
profiles, sessions, participants, questions, responses, confusion_maps,
diagnoses, practice_attempts, teach_backs, mastery.

## AI structured contracts
`ConfusionMap`, `Diagnosis` (incl. repair path + ErrorTwin), `Explanation`,
`PerspectiveSet`, `TeachBackEvaluation`. All validated before use; any invalid
LLM output falls back to the deterministic analyzer.

## Mastery states
red = misconception present · yellow = right answer, shaky reasoning ·
green = understands and transfers · blue = can teach it back.
