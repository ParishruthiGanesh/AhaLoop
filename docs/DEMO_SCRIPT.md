# ThinkTrace AI — 2-minute demo recording script

Keep this open on a second screen while you record.

---

## Before you hit record

Do all of this first. The video should start with everything already warm.

### 1. Check the money and the mode
- Anthropic credits are topped up.
- Open the app → header badge reads **Connected** (not *Demo mode*).

### 2. Browser A — Safari — the teacher
1. Sign in as your teacher account.
2. Go to `/demo` → **Enter as the teacher**.
   This seeds *ML Evaluation — Week 6* with the sample question already
   published and **five simulated students** who have answered with five
   genuinely different kinds of reasoning. This is the thing that makes the
   confusion map look real in fifteen seconds.
3. Write the join code on a sticky note. You will need it in Browser B.
4. **Do not** click *Analyse responses* yet — that is a beat in the video.

### 3. Browser B — Chrome — the student
1. Sign up as a student with a different email.
2. **Join with a code** → enter the join code.
3. Stop there. Do not answer yet — answering live is a beat in the video.

### 4. Pre-warm the slow screens
In a **third** tab (not one you will film), run one diagnosis and one Kannada
explanation on any throwaway account. The first model call of the session is
the slowest; this gets it out of the way so nothing stalls on camera.

### 5. Window setup
- Both browsers at the same zoom, side by side, or full-screen and switch with
  Cmd+Tab. Side by side is better — the teacher screen updating while the
  student submits is the single most convincing shot in the video.
- Hide bookmarks bars (Cmd+Shift+B) and close unrelated tabs.
- Record with **Cmd+Shift+5** → *Record Selected Portion* → include audio.

### Never do these on camera
- Do not restart the dev server.
- Do not open the terminal.
- Do not sign out — you will lose the seeded classroom.

---

## The script

Times are cumulative. Total 2:00. Narration in **bold**, actions in plain text.

### 0:00 – 0:12 · The problem

Show the landing page.

> **"Every classroom tool tells a teacher how many students got it wrong.
> None of them say why. ThinkTrace AI does."**

### 0:12 – 0:25 · The classroom

Cut to Browser A, teacher control room.

> **"A teacher opens a live session, students join with a code, and answer one
> question. Crucially, they also write down their reasoning."**

Point at: the join code, the published question, the five responses already in.

### 0:25 – 0:40 · Live, and real

Switch to Browser B. Pick an option and type this reasoning:

```
95% sounds really high to me so the model must be working well.
Anything above 90 is good.
```

Click **Submit answer**. Immediately switch to Browser A.

> **"Answers arrive live."**

Let the viewer see the new response appear in the feed. This shot sells that
it is a real application, not a mockup.

### 0:40 – 1:00 · The idea

Click **Analyse responses**.

> **"Now the part that matters. It doesn't group by which option they ticked —
> it groups by the reasoning behind it. Six students, five different
> misconceptions. One thinks accuracy is quality. One has precision and recall
> swapped. One can do the maths but can't choose the metric. One blames the
> algorithm. One actually understands it."**

Scroll slowly down the confusion map so each row is readable.

### 1:00 – 1:12 · What the teacher does next

> **"And it doesn't stop at diagnosis. Here's a two-minute intervention the
> teacher can deliver right now, a counterexample for the board, and a
> follow-up question that separates the group that gets it from the group that
> doesn't."**

### 1:12 – 1:35 · The student's side

Switch to Browser B. Click **Why was this wrong? Open ConceptLens**.

> **"The student opens their own answer. ThinkTrace names the belief that
> produced it — not the wrong answer, the belief — shows why it fails with
> real numbers, and states how confident it is."**

Point at the misconception line and the confidence number.

> **"Then it finds what's actually missing underneath, and gives the shortest
> path back. Not 'revise the chapter' — two concepts, a few minutes each."**

Click through to **Prerequisite repair**.

### 1:35 – 1:48 · Practice and language

Go to **ErrorTwin practice**. Answer one question.

> **"Practice is built around the reasoning pattern, not the question — the
> same trap in a domain they've never seen."**

Go to **Other explanations** → set language to **Kannada** → **Rewrite**.

> **"And any student can read it in their own language, with the technical
> terms kept in English."**

Let the Kannada text sit on screen for two full seconds. Nobody else will
have this.

### 1:48 – 2:00 · Closing the loop

Go to **Teach-back**. Paste this:

```
Only about 1% of transactions are fraud, so a model that just labels
everything "not fraud" is already 99% accurate. Our 95% is below that
baseline. Every fraud it misses is a false negative and those barely move
accuracy, so what matters is recall on the fraud class. The same trap shows
up in screening for a rare disease.
```

Click **Submit my explanation**. Wait for **Misconception resolved**.

> **"The loop only closes when the student explains it back and the
> misconception is genuinely gone."**

Cut to Browser A, scroll to *Understanding by student*.

> **"And the teacher sees it resolved. Not because they finished an activity —
> because their own explanation no longer contains the mistake."**

End on that screen.

---

## If something goes wrong mid-take

- **A screen falls back to the built-in analyzer** → it will say why on screen.
  Usually credits. Stop, fix, start the take again.
- **A model call is slow** → keep talking over it; do not click again, that
  queues a second call.
- **You lose the classroom** → you signed out or restarted the server. Re-run
  the pre-flight.

## Trimming to 90 seconds

Cut 0:25–0:40 (the live answer) and start the analysis with the five seeded
students only. Keep the Kannada beat and the resolved beat — those are the
two nobody else will have.
