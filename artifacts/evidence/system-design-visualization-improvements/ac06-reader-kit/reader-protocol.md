# AC-06 Reader Protocol — Architecture Reading (two sessions)

You are the independent reader for a comparison of two diagram presentations. Nothing in this
kit tells you what the diagrams mean; the questions do, and the images answer them.

**You must not be the author of the renderer change under test.** Sign the declaration at the
bottom of your first session's sheet before you start.

## What you receive

At the start of each session you receive **only that session's material** — never both sessions
at once:

- the folder for the current session: `session1/` at session 1, `session2/` at session 2, each
  with six images named `S1.png` … `S6.png`. `S1.png` in both sessions is the same diagram, shown
  in a different presentation;
- `questions.reader.json` — four fixed questions per scenario, identical in both sessions;
- one response sheet: `response-sheet-session1.csv` at session 1, `response-sheet-session2.csv`
  at session 2.

Open nothing outside the material you are handed for the current session. Specifically: no spec,
no source repository, no scoring material, no other image folder, no other session's sheet, and
no chat transcript of the implementation.

## The two sessions

1. **Two sittings, at least 48 hours apart.** Each session is one cold read of all six diagrams.
   Record the real UTC start time of each session and do not shorten the gap; a gap under 48
   hours makes the sheets unscorable and the comparison is thrown away.
2. **One presentation per diagram per session.** You see each diagram exactly once in session 1
   and once in session 2, in its other presentation. Do not revisit the other session's images
   during this one, and do not compare the two presentations side by side.
3. **Your session-1 answers are not yours to keep.** Hand the session-1 sheet to the operator at
   the end of session 1. Do not keep, photograph, copy or consult your session-1 answers, and do
   not ask for them back: seeing them in session 2 would measure recall instead of reading.
4. **Recognition is expected to be minimal after the washout, and you must record it.** If a
   diagram in session 2 feels familiar from session 1, answer from the image in front of you and
   enter `y` in `recognised_prior` for that row; otherwise enter `n`. Do not stop, and do not
   discard the diagram.
5. **Order is given.** Read the scenarios in the order the sheet lists them. Do not reorder.

## Rules

1. **Cold read.** Open one image at a time. Do not preview the next scenario.
2. **One scenario per sitting block.** Finish all four questions for one scenario before moving
   on. Take a short break between scenarios.
3. **Scale and theme.** View at 100% zoom, light theme, window at least 1280 px wide. Use zoom
   only to read a label you have already located at 100%; do not pan-hunt.
4. **Timer, per question.** For Q1: start the timer first, then open the image. For Q2–Q4: start
   the timer when you begin reading the question text. Stop when you have written the answer, and
   record whole seconds in `seconds`. Each question is timed on its own: Q2–Q4 do not include the
   time spent on earlier questions, and no time is spent looking at a diagram before its first
   timer starts. Do not correct the timer afterwards; if you revise an answer, keep the original
   time and note the correction in `notes`.
5. **No coaching, no help.** Do not ask anyone what a box means, do not search the web, do not
   open the spec or source. If a diagram does not show something, answer "not shown" — that is a
   valid and useful answer.
6. **Answer in your own words.** Name boxes as printed. For paths, write the order you believe
   the flow takes. Guessing is worse than saying the diagram does not show it.
7. **Record, do not judge.** Do not score your own answers and do not write a verdict: the
   answer key and the verdicts are held by other people. Leave the operator-only columns empty.

## Per-question procedure

For each of Q1–Q4 of the current scenario:

1. Confirm the `session`, `scenario` and `question_id` cells match what you are looking at.
2. Start the timer (for Q1, before opening the image), then read the question text from
   `questions.reader.json` verbatim.
3. Answer from the image only.
4. Stop the timer and write the answer in `answer` and the elapsed whole seconds in `seconds`.
5. Set `recognised_prior` to `y` or `n`.
6. Leave `applicable` as pre-filled. It is fixed in advance; if you believe a question cannot
   apply to this diagram, say so in `notes` instead of editing the flag.

## Writing answers in the CSV

- Separate list items with ` -> ` or `;`.
- Put the whole cell in double quotes if the answer contains a comma. An unquoted comma splits
  the row and the sheet is rejected.
- Fill `session_started_utc` with the real UTC start of that session, e.g.
  `2026-11-07T09:15:00Z`, on every row of that session, and fill `reader` with the same short id
  on every row.

## After the session

Hand that session's sheet back unmodified, together with nothing else. Do not copy it, and do not
keep a version of it. The operator handles everything that follows.

## Author-independence declaration

Copy this line into `notes` of your first row, and sign the run metadata:

> I am not the author of the diagram renderer change under test. I read these images cold in two
> sessions at least 48 hours apart, answered without coaching, and consulted no scoring material.

## What this protocol cannot establish

- It cannot prove either presentation is better in general: six scenarios, one reader, two sittings,
  and a renderer-level change only.
- It cannot substitute for usability review of the diagrams' content: a fast, correct read of a
  misleading architecture is still a misleading architecture.
- It cannot produce the AC-06 verdict without a real reader. An unfilled sheet, a self-scored
  sheet, or a sheet filled by an agent is `PENDING`, never `PASS`.
