# Serbian Lingo — Full App Build (Phases 0–2b)

## GOAL
Build the entire Serbian Lingo app end-to-end: Expo+Convex scaffold, the Duolingo-faithful design-system primitives, the Serbian content pipeline for units 1-3, the lesson engine, and all screens — so a full lesson can be played in the simulator and Luka can review real output (content correctness, visual design, Serbian audio quality) in one sitting. This is the vertical slice that proves the whole product works before scaling to units 4-9 and a real device install (separate, later steps — out of scope here).

Done when ALL of these are true (only a passing check flips a box — never your judgment, never a worker's claim):
- [ ] Expo app scaffolded, typechecks — check: `npx tsc --noEmit` exit 0, `npx expo export` succeeds (independent)
- [ ] Convex schema matches SPEC.md §2 incl. publishing-rule validation (approvedAt gate, audio-completeness check, append-only lesson ordering) — check: `npx convex dev`/`deploy` output clean, schema file present (independent)
- [ ] Curriculum snapshot checked in — check: `data/curriculum/section1.json` exists, 9 unit objectives present (independent)
- [ ] Units 1-3 Serbian content generated + review docs — check: `data/units/unit-0{1,2,3}.json` + `data/review/unit-0{1,2,3}.md` exist, sentences use the named cast (see CONTEXT.md) (depends on: curriculum snapshot)
- [ ] Design tokens + all 10 primitives (Button, Tile, OptionCard, FeedbackSheet, ProgressBar, PillLabel, SpeakerButton, SpeechBubble, StatCard, PathNode) built; gallery screen renders every state — check: gallery screenshots pasted, compared against docs/ui-reference.md's Mobbin links (depends on: scaffold)
- [ ] Lesson engine core: challenge queue, mistake re-queue-at-end, grading (diacritic + typo tolerance per SPEC §4) — check: unit test output green (depends on: scaffold)
- [ ] All 10 challenge-type renderers built on primitives + engine — check: component test output + gallery-run screenshots per type (depends on: primitives, engine)
- [ ] 5 screens composed: ProfilePicker, Path, Lesson, LessonComplete, Streak — check: simulator screenshots, nav flow walkthrough (depends on: renderers)
- [ ] Seed script enforces SPEC §2 publishing rules — check: validation test proves it rejects an unapproved unit AND a unit with missing audio (depends on: schema, content)
- [ ] Audio-gen script + expo-audio playback tested against mocked Azure responses / local dummy MP3s — check: test output (depends on: scaffold)
- [ ] Real Azure synthesis, units 1-3 words+sentences, both voices — check: generated MP3 file listing, non-zero bytes — **BLOCKED without AZURE_SPEECH_KEY; acceptable to stay blocked, log why** (depends on: Luka's Azure key)
- [ ] Full lesson plays end-to-end in simulator, seeded-but-unapproved test content, no crashes — check: screenshot sequence or recording (depends on: screens, seed script)

NOT your job (Luka reviews by eye, outside the loop): which Azure voice sounds better; whether the Serbian in review docs is correct/natural; whether the primitive gallery matches Duolingo's feel; final go/no-go on publishing content or installing on a device.

## PARALLELISM
- You are the coordinator: you may implement items yourself or fan independent items out to parallel subagents / a dynamic Workflow, max 6 concurrent, one item per worker, each in an isolated worktree, each handed only its item + this file's EVIDENCE and BOUNDARIES sections.
- Natural swarm waves: **Wave 1** — scaffold, Convex schema, curriculum snapshot, audio-gen script skeleton (all independent). **Wave 2** — once scaffold exists: 3 content-unit workers in parallel, tokens+10-primitive workers in parallel, engine-core worker. **Wave 3** — once primitives+engine exist: 10 renderer workers in parallel. **Wave 4** — screens (partially parallel), seed script, e2e assembly.
- Workers implement; they never flip checkboxes, never write the ledger, never merge. You verify each result with the item's check (or a fresh verifier subagent that didn't write the code), merge accepted work one item at a time, and paste the verifying output into the conversation.
- Ordered items wait for dependencies to be VERIFIED done. A failed worker result returns its item to the pool with a note in LEDGER.md; it doesn't block the batch. Merge conflicts resolve toward the already-verified item.
- **Two kinds of blocked — do not treat them the same:**
  - **Human-dependency blockers** (known, named, safe to work around): the item needs a credential, sign-off, or subjective call only Luka can give — e.g. item 11 needs `AZURE_SPEECH_KEY`. You know exactly what's missing and continuing other items carries no risk of wasted/wrong downstream work. **Never stop the run for these.** Log in LEDGER.md (`item | blocked-human | <what's needed>`), skip it, keep working every other unblocked item. Sweep back over every parked human-dependency item **once as a final pass**, after all other items are verified done — recheck whether the dependency showed up mid-run (e.g. `.env.local` now has the key) before giving up on it.
  - **Absolute blockers** (stop immediately): you don't know how to proceed and continuing risks building on a wrong assumption — a genuine spec contradiction, a technical dead-end you can't resolve after real attempts, an error you can't diagnose, anything destructive/irreversible-adjacent. Do not guess and plow forward. Go straight to IF BLOCKED below, right now, even if other items are still unblocked.

## EVIDENCE
Every progress claim = the exact command + trimmed output (or screenshot path) pasted into the conversation, and one line appended to loops/full-app/LEDGER.md (item, outcome, evidence ref, and for failures/blocks WHY — so later turns and Luka can audit). A claim without an artifact is a broken loop.

## IF BLOCKED
- **Absolute blocker hit mid-run:** write "## BLOCKED" to LEDGER.md immediately — what you tried, why it failed, current best theory, the ONE thing you need from Luka. Say so in the conversation and stop working now, even with other checklist items still open. Don't let unrelated tracks mask a real dead-end.
- **End of run, only human-dependency items remain** (the normal, expected way this loop ends): after the final sweep confirms each parked item's dependency is still missing, write ONE consolidated "## BLOCKED" to LEDGER.md listing every parked item and exactly what it needs (Azure key, unit 1-3 QA sign-off, gallery approval, etc.). Say so in the conversation and stop.
- Either way, the goal's turn budget winds down once you've posted BLOCKED — don't keep spinning on items you've already logged as blocked.

## BOUNDARIES
- Never touch: `main` branch directly (work on a feature branch/worktree); any file under `docs/` (PRD/SPEC/ui-reference are locked references — read-only)
- Never without Luka: setting `approvedAt`/`publishedAt` on any content unit (the seed script should refuse this itself — don't work around it); pushing to any remote; deploying anything; installing on a physical device; committing secrets (AZURE_SPEECH_KEY etc. — `.env.local` only, gitignored)
- Work happens in: a dedicated git worktree/branch for this loop (e.g. `loop/full-app`)
