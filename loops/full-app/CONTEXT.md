# Context — Serbian Lingo Full-App Loop

Read first, in order: `docs/PRD.md` (product 1-pager — why/who/what), `docs/SPEC.md` (technical spec — source of truth for data model, all 10 challenge types, grading rules, publishing rules, phase plan), `docs/ui-reference.md` (Duolingo UI anatomy with linked Mobbin screenshots per screen/primitive state).

## Environment
- The repo is currently empty except `docs/` — you are creating the entire app from scratch, including `package.json`.
- Stack: Expo (React Native + TypeScript, Expo Router), Convex backend, `expo-audio` for playback, Nunito font (closest free match to Duolingo's face).
- No existing branch conventions — create a dedicated worktree/branch for this loop's work (`loop/full-app`).
- `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` belong in a gitignored `.env.local`, supplied by Luka. Do not block on their absence — build and unit-test the audio-gen script against mocked Azure API responses; real synthesis (LOOP.md item 11) simply stays logged-blocked until the key lands.

## Content specifics — get this right, it's a gift, not a generic clone
- Serbian in **Latin script only**, taught **from English**. Standard ekavian.
- Recurring characters across ALL generated sentences: **Dominika** (the recipient — girlfriend), her family **Julia** (sister), **Agnieszka** (mom), **Wieslaw** (dad); Luka's family **Stefan** (brother), **Olivera** (mom), **Slobodan** (dad), **Lidija** & **Biljana** (aunts), **Nesa** (uncle), **Filip** (cousin). Weave these in naturally across sentences — not forced into every single one.
- Audio must be keyed to the **exact displayed Serbian surface form** (inflected), never the dictionary lemma — Serbian has 7 cases, so "vodu" and "voda" are different audio clips entirely. See SPEC §2's `audioClips` vs `vocab` split — do not collapse these back into one table.
- Curriculum scope-and-sequence source: mirror Duolingo's Polish-for-English course Section 1 (~9 units, A1). The underlying research (duolingodata.com current-path structure: 3 sections / 67 units / per-unit objectives; duome.eu legacy vocab dumps ~1.9k words) was already done and verified on 2026-07-09 — compile the static `section1.json` snapshot from that prior research rather than re-scraping live sources.

## Design system specifics
- Full Duolingo-clone visual language — see `docs/ui-reference.md` for exact colors (`#58CC02` green, `#1CB0F6` blue, `#FF9600` orange streak, `#FFC800` gold XP, `#FF4B4B` red), the "3D press" button treatment (darker bottom-edge border that visually collapses on press), and per-screen anatomy with linked Mobbin reference screenshots for every state.
- **Architectural rule that keeps rework cheap**: every screen/renderer must consume primitives and tokens — never inline-duplicate a color, radius, or button style. If Luka's later gallery review requests a visual change, it should only ever require editing `tokens.ts` or one primitive component, never every screen.

## Known traps
- `expo-audio` is the successor to the deprecated `expo-av` — confirm the current API surface before writing playback code; don't trust training-data memory of the API, check the installed version's actual exports.
- Serbian diacritics (š ž č ć đ) and ASCII-folded typing (s/z/c/c/dj) need explicit grading-tolerance logic per SPEC §4 — don't skip this, it's core to the typing exercises feeling fair rather than pedantic.
- The publishing-rule validation (SPEC §2) is a real safety mechanism, not paperwork: it must be genuinely impossible for the seed script to publish a unit without `approvedAt` set, or with any displayed Serbian string missing an `audioClips` entry. Write a failing-case test that proves rejection — don't just assume it from reading the code.
- Don't generate unit-4+ content inside this loop even if a worker is idle — units 1-3's QA feedback may change tone/approach for the rest. That's a deliberate scope boundary from the 2026-07-09 design-loop session, not an oversight; leave it for a follow-up loop once real QA signal exists.

## Reference — the full challenge-type list (SPEC §4)
`translate_bank`, `translate_bank_reverse`, `translate_type`, `fill_blank`, `complete_translation`, `mark_meaning`, `match_pairs`, `complete_chat`, `listen_tap`, `listen_type`. (`select_image` and `speak` are explicitly out of scope for this loop — future work per the PRD.)
