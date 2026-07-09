# Serbian Lingo — Technical Spec & Implementation Plan

Companion to [PRD.md](PRD.md) (product requirements) and [ui-reference.md](ui-reference.md) (visual reference, Mobbin-sourced). Research basis: deep-research pass on 2026-07-09 — verified curriculum dumps, Duolingo's own Method whitepaper/blog for mechanics, TTS provider catalogs, and open-source clone schemas.

## 1. Architecture

Three parts, deliberately decoupled:

```
Content pipeline (scripts, run on demand)
   └─→ Convex (content + word audio + per-profile progress)
          └─→ Expo app (screens + lesson engine, iOS-first)
```

- **Content lives in Convex, not in the app bundle** — units 4–9 and QA fixes ship without reinstalls.
- **Audio is pre-generated** for every unique Serbian surface form AND every sentence prompt (no runtime TTS calls) — the app only ever plays static MP3s.
- **No auth.** Two profile documents; the app stores the picked profile id locally.

### Stack

| Piece | Choice | Why |
|---|---|---|
| App | Expo (React Native + TypeScript, Expo Router) | User requirement; one codebase, iOS-first |
| Audio | `expo-audio` | Successor to deprecated `expo-av` (confirm version at Phase 0) |
| Backend | Convex | User requirement; queries/mutations + file storage in one |
| TTS | Azure AI Speech, `sr-Latn-RS` | Only provider with native Latin-script Serbian; neural voices Sophie/Nicholas (verified) |
| TTS fallback | Google Cloud TTS `sr-RS` (Chirp 3: HD) | 30 premium voices, Cyrillic-catalogued; Serbian Latin↔Cyrillic is a 1:1 deterministic mapping, so transliteration is trivial |
| Fonts | Nunito (ExtraBold/Bold) | Closest free match to Duolingo's rounded face |
| SFX | Bundled CC0 assets | Correct ding, wrong thud, match sparkle, lesson fanfare, streak |

## 2. Data model (Convex)

Modeled on the verified open-source clone hierarchy (courses → units → lessons → challenges → options), adapted to Convex documents:

- **profiles** — `name`, `dailyGoalXp`, `xpTotal`, `currentStreak`, `longestStreak`, `lastActiveDay` (YYYY-MM-DD, device timezone)
- **units** — `order`, `title`, `objective`, `color` (path/banner theming), `sectionTitle`
- **lessons** — `unitId`, `order`, `kind` (`lesson` | `chest`)
- **challenges** — `lessonId`, `order`, `type` (enum, §4), `payload` (per-type JSON: prompt, correct answer(s), distractor pool), `newVocabIds`
- **audioClips** — `text` (the exact Serbian Latin string as displayed — inflected surface form or full sentence; Serbian's seven cases mean displayed forms like "vodu" ≠ lemma "voda", so lemma-keyed audio would be wrong), `kind` (`word` | `sentence`), `audioStorageId`; unique index on `text`
- **vocab** — `lemma`, `gloss`, `introducedInUnit` — drives the NEW WORD pill and review docs; playback never resolves through vocab, always through `audioClips` by exact displayed text
- **completions** — `profileId`, `lessonId`, `xpEarned`, `accuracy`, `durationSec`, `day`
- **xpEvents** — `profileId`, `day`, `amount` (daily-goal progress = sum for today)

Progress rules: a lesson node unlocks when the previous node is complete; streak = consecutive days with ≥1 completion, updated transactionally on lesson completion.

Content identity & publishing rules (so content updates never corrupt progress):

- Units, lessons, and challenges carry **stable, human-authored string ids** in the source JSON (`u1`, `u1-l3`, `u1-l3-c07`); completions reference lesson ids, so republishing content never invalidates progress.
- Units carry `approvedAt` (Luka's QA sign-off) and `publishedAt`; the seed script refuses to publish an unapproved unit.
- **Published lessons are never reordered or deleted** — new content only appends; challenge *fixes* (typos, better distractors) are edits under the same id.
- Seed validation blocks publishing if any displayed Serbian string lacks an `audioClips` entry, any challenge is missing accepted answers, or ids collide.

## 3. Content pipeline (`scripts/`)

1. **Curriculum snapshot (checked in — no scraper machinery)** — `data/curriculum/section1.json`: one static, hand-assembled snapshot of the Polish course's Section 1 scope (9 unit objectives + vocab coverage), compiled once from the public dumps (duolingodata.com current path, duome.eu vocab lists). The dumps are scope-and-sequence guides, not gospel (legacy tree ≠ current path, verified); Luka's review docs are the real quality gate.
2. **`generate-unit`** — produce `data/units/unit-NN.json` for a Serbian unit mirroring the Polish unit's objective: vocab, sentences + accepted translations, distractors, challenge sequence with the recognition→production ramp, stable ids per §2. Standard ekavian Serbian, Latin script. Recurring characters: Dominika, Julia, Agnieszka, Wieslaw, Stefan, Olivera, Slobodan, Lidija, Biljana, Nesa, Filip.
3. **QA gate** — each unit also emits `data/review/unit-NN.md`: every sentence + translation in a readable table. **Luka approves before seeding** (`approvedAt` set on sign-off). (~10 min/unit)
4. **`generate-audio`** — diff the unit's unique Serbian surface forms AND full sentence prompts against existing `audioClips` → Azure TTS (`sr-Latn-RS`, chosen voice) → MP3s into Convex storage. Idempotent, keyed by exact text.
5. **`seed`** — upsert approved unit JSON into Convex under stable ids, enforcing the §2 publishing rules (approval required, audio-completeness validation, append-only ordering). Safe to re-run; never touches progress.

## 4. Lesson engine

Mechanics from Duolingo's 2023 Method whitepaper + blog (all verified):

- **Lesson size:** 10–14 challenges, ~2–3 minutes.
- **Queue with mistake re-queue:** wrong answer → challenge re-enqueued at the end; lesson completes only when every challenge has been answered correctly. Progress bar advances on correct answers only.
- **Recognition→production ramp:** early lessons in a unit bias to word-bank/matching/selecting; later lessons bias to typing and reverse translation (EN→SR tagged `HARD EXERCISE`).
- **New-word intro:** first appearance tagged with the `NEW WORD` pill; word audio auto-plays.
- **Feedback:** green sheet + ding on correct; red sheet with correct answer + meaning on wrong. Micro-celebration per exercise, big reward at lesson end (whitepaper's two-tier reward loop).
- **XP:** 10 base + 5 perfect-lesson bonus. Completion screen shows the three stat cards (XP / time / accuracy).
- **Streak:** first completion of the day → streak screen (flame + week calendar); milestone variants at 7/30/50/100.

### Challenge types (v1)

| Type | Prompt | Answer mechanism |
|---|---|---|
| `translate_bank` | SR sentence (audio) | build EN from word tiles |
| `translate_bank_reverse` | EN sentence | build SR from word tiles (tiles play audio) |
| `translate_type` | SR sentence (audio) | type EN — later lessons: EN→SR |
| `fill_blank` | SR sentence with gap | pick word from tile row |
| `complete_translation` | SR sentence + EN with gap | type/pick the missing word |
| `mark_meaning` | SR sentence | pick 1 of 3 EN meanings |
| `match_pairs` | — | match 5 SR↔EN tiles (SR tiles play audio) |
| `complete_chat` | 2-bubble dialogue | pick the appropriate reply |
| `listen_tap` | word audio | pick the word (2×2 grid) |
| `listen_type` | word audio | type the word |

Deferred: `select_image`, `speak` (future scope per interview).

### Grading (typed answers)

- Normalize: lowercase, strip punctuation, collapse whitespace; check against accepted-answers list.
- Diacritics tolerance: accept ASCII-folded Serbian (`s`→`š`, `dj`→`đ` …) with a gentle "watch the accents" note.
- Typo tolerance: edit distance 1 on words ≥5 chars → "You have a typo" but counted correct (Duolingo behavior).

## 5. Audio behavior (parity requirement)

Audio plays **everywhere Duolingo plays it**:

- Exercise mount → auto-play the prompt's pre-generated **sentence MP3** (natural, not stitched); speaker button replays.
- Tap any Serbian word or tile, any screen → plays that word's surface-form clip.
- Match-pairs SR tiles and listening exercises play on tap.
- Client caches MP3s on device (keyed by clip text) so lessons feel instant and repeat plays are free.
- SFX layer independent of word audio.

## 6. Design system (Phase 2a) & screens

Primitives-first, per [ui-reference.md](ui-reference.md): tokens (palette, radii, spacing, type scale, 3D-edge) → `Button` (press-collapse animation, color variants) → `Tile` (default/pressed/ghost/selected/flash-green/shake-red + audio-on-tap) → `OptionCard` → `FeedbackSheet` → `ProgressBar` → `PillLabel` → `SpeakerButton` → `SpeechBubble` → `StatCard` → `PathNode`. All rendered in a hidden **gallery screen**, screenshot side-by-sides against Mobbin references — **Luka reviews the gallery before any real screen is composed.**

Screens: ProfilePicker → Path (stat header, colored unit banner, winding nodes, lesson-start popup) → Lesson (renderer host + engine) → LessonComplete → Streak. Character art: small set of simple flat avatars for speech bubbles (not load-bearing; full character art out of scope).

## 7. Phases, checkpoints, dependencies

| Phase | Delivers | Checkpoint / evidence | Needs from Luka |
|---|---|---|---|
| **0 — Scaffold + audio proof** | Expo + Convex wired; Azure `sr-Latn-RS` test — ~20 words incl. digraphs (lj/nj/dž) plus a few full sentences, both voices — on a throwaway play screen; playback spike (preloading, rapid taps) | Luka listens, picks voice. Fallback: Google + transliteration | **Azure Speech key** (free tier; click-by-click provided) |
| **1 — Content, units 1–3** | Curriculum snapshot checked in; units 1–3 generated + review docs; word + sentence MP3s in Convex | Luka QAs review docs | ~10 min/unit review |
| **2a — Primitives** | Token file + full primitive library + gallery screen | Side-by-side screenshots vs Mobbin; **Luka approves the look** | Gallery review |
| **2b — Screens + engine** | All screens, lesson engine, 10 challenge renderers, streak/XP, profiles, SFX | Simulator walkthrough video/screenshots; engine + grading unit tests green | — |
| **3 — Fill + polish + deliver** | Units 4–9 through QA; polish pass; private install on Dominika's iPhone | Full Section 1 playable end-to-end | Unit reviews; pick the signing path at install time |

Delivery: install on Dominika's iPhone through **private iOS distribution**. No App Store release, public TestFlight, accounts, analytics, or review flow. Development happens in the simulator/Expo Go throughout; we choose the lowest-friction signing path once the app is ready — the only real constraint is that iOS requires *some* signing/install method even for a private app.

## 8. Risks & mitigations

- **Azure Latin-voice quality unproven for short words/sentences** → Phase 0 is the kill-switch; Google fallback ready via 1:1 transliteration.
- **Curriculum dumps are guides, not gospel** (legacy↔current mismatch) → we mirror objectives + vocab coverage, not literal lesson order; Luka's QA is the correctness gate for Serbian.
- **`expo-audio` behavior for preloading + rapid tap-to-play of many short clips unverified** → Phase 0 spike; fallback patterns exist (single player reused vs. pool).
- **iOS private-install signing** → the one unavoidable Apple constraint; path chosen at Phase 3, zero distribution planning before then.

## 9. Running costs

Azure free tier covers the course's audio many times over (a few thousand short words + sentences ≪ free monthly character allowance); Convex free tier is ample for one user. The only potential cost is whatever private iOS signing route we pick at delivery time.
