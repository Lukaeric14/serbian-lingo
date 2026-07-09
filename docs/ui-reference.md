# UI Reference — Duolingo iOS (from Mobbin)

Goal: replicate Duolingo's iOS UI as faithfully as practical ("full Duolingo clone look"). Personal-use app.
Source screenshots reviewed on Mobbin, 2026-07-09. Links at the bottom.

## Design tokens

- **Colors** (Duolingo's published palette): green `#58CC02` (primary/correct), blue `#1CB0F6` (secondary buttons, listening), orange `#FF9600` (streak flame), gold `#FFC800` (XP), red `#FF4B4B` (wrong/hard), purple `#CE82FF`, text dark-gray `#4B4B4B`, borders light-gray `#E5E5E5`, background white.
- **Feedback tints**: correct sheet = pale green (`#D7FFB8`-ish) with dark-green text; wrong sheet = pale pink with dark-red text.
- **Buttons**: chunky "3D press" style — solid fill, darker same-hue bottom edge (~4px border-bottom), radius ~16px, label ALL-CAPS bold white (`CHECK`, `CONTINUE`, `GOT IT`, `START +25 XP`). Disabled = gray fill, gray label.
- **Tiles** (word bank, options): white, 1px light-gray border, ~12px radius, subtle darker bottom edge; tap leaves a flat gray ghost placeholder behind.
- **Type**: Duolingo uses its own rounded face (Feather Bold / DIN Round). Closest free match: **Nunito** (ExtraBold for headings/buttons, Bold/SemiBold for body).
- **Unit theming**: each unit has its own accent color (green → blue → purple → pink…); the unit banner AND the path nodes take that color.

## Screen anatomy

### 1. Home / learning path
- Top stat bar, icons + numbers: streak flame + count, XP/gems. (Ours: streak + today's XP vs daily goal.)
- Sticky colored banner: small-caps `SECTION 1, UNIT 1` over bold unit title ("Use basic phrases"). Banner color = unit accent.
- Winding vertical path of circular 3D nodes (~70px), alternating left/right offsets (sine curve). Node states: **active** (unit color, star icon, bold ring/pulse), **completed** (unit color or gold star), **locked** (flat gray). Special nodes: treasure chest (reward), dumbbell (practice), trophy (unit end).
- Character illustration sits beside the path mid-unit (we use our own art).
- Tapping active node → speech-bubble popup: lesson title, "Lesson 4 of 6", `START +25 XP` (unit color).
- Bottom tab bar with flat icons in rounded squares. (Ours: Path, Profile/Stats.)

### 2. Translate sentence — word bank (signature exercise)
- Header: `X` quit (left) + rounded progress bar (green fill).
- Optional purple pill label `✦ NEW WORD` above title when introducing vocab; red `HARD EXERCISE` label for reverse direction.
- Title: "Translate this sentence".
- Character + speech bubble: source sentence, blue speaker icon (autoplays on load, tap replays). Each word dotted-underlined; tapping a word shows meaning tooltip + plays its audio (Serbian side).
- Answer area: 2–3 horizontal ruled lines where picked tiles land.
- Word bank: tile rows centered at bottom; distractors mixed in.
- `CHECK` disabled until an answer exists.

### 3. Answer feedback (bottom sheet over exercise)
- **Correct**: pale-green sheet slides up — ✅ circle + "Nicely done!"/"Awesome!", flag-report icon, green `CONTINUE`. Ding sound.
- **Wrong**: pale-pink sheet — ❌ "Incorrect", then "Correct Answer:" + solution (+ "Meaning:" line), red `GOT IT`. Thud sound. Exercise re-queued to end of lesson.

### 4. Tap the matching pairs
- Title "Tap the matching pairs"; 2 columns × 5 rows of tall rounded tiles (Serbian left, English right, shuffled).
- Selected tile: light-blue fill/border. Match: both flash green + sparkle, then fade to disabled. Mismatch: brief red shake.
- Serbian tiles play their word audio on tap.

### 5. Listening — "What do you hear?" / "Tap what you hear"
- Big blue rounded-square speaker button (~120px) centered; optional small turtle button = slow replay (we can use a slower TTS-rate clip later — skip in v1).
- Word variant: 2×2 grid of option tiles. Sentence variant: word-bank build.
- Quiet-mode escape link at bottom: "CAN'T LISTEN NOW" (skips listening exercises for the session).

### 6. Type the translation
- Character + bubble with source sentence (audio + word hints), large rounded text area, `CHECK`, system keyboard up.
- Grade with tolerance: case-insensitive, punctuation-insensitive, accept š/ž/č/ć/đ typed without diacritics (s/z/c/c/dj) but show a gentle "watch the accents" note — Duolingo's typo-forgiveness behavior.

### 7. Fill in the blank / Complete the sentence
- Sentence rendered inline with a rounded empty slot; options as a tile row below (or stacked full-width buttons).
- Correct feedback sheet may show "Nice! Meaning: …".

### 8. Complete the chat
- Two character bubbles (mini dialogue), question line, stacked option buttons — same option-button styling as fill-in-blank.

### 9. Lesson complete
- Celebration illustration centered, gold heading "Lesson complete!" (variants: "Perfect lesson!").
- Row of 3 stat cards, each a colored header band + white body: `TOTAL XP` (gold, ⚡ value) / `QUICK` (blue, time) / `PERFECT!`-`GREAT` (green, accuracy %).
- Blue `CONTINUE` / `CLAIM XP`. Fanfare sound + confetti.

### 10. Streak screen (after first lesson of the day)
- Huge flame + day count + "day streak!", week-calendar card (day initials, orange check circles filling left→right), encouragement line, blue `CONTINUE`.
- Milestone variant: full-orange background.

## Mobbin source links

- Path (green, Unit 1): https://mobbin.com/screens/bfed6f7e-2b16-4e4a-a60d-ec4c7011d5b4
- Path (lesson-start popup): https://mobbin.com/screens/3ecf07e8-cea8-4414-b5d9-05cd21033429
- Path (jump-ahead node): https://mobbin.com/screens/828d1ae6-bb6d-4c01-8c6b-be0f6b54590b
- Word bank (new word + hint tooltip): https://mobbin.com/screens/3d1e792b-518f-4038-bc2c-30e1a9017893
- Word bank (mid-answer ghosts): https://mobbin.com/screens/ee7cd425-4c81-47bb-9035-68cf979a017a
- Word bank (hard/reverse): https://mobbin.com/screens/bb075437-bdb1-4c18-ab7b-fdeb460bf3dd
- Correct feedback sheet: https://mobbin.com/screens/e0754728-0f1e-4fd4-b2fb-19341f5c58e3
- Wrong feedback sheet (fill-in-blank): https://mobbin.com/screens/7e486c79-f420-46f9-acc6-7e741f7a2fe0
- Match pairs (selected state): https://mobbin.com/screens/bfdbb9c2-d906-4849-bbd2-4d48cecaa70a
- Listening 2×2: https://mobbin.com/screens/c5557d96-ba8a-42f6-a4ce-40fdb0c6d7a7
- Listening word-bank + slow turtle: https://mobbin.com/screens/2be3324f-b03a-42fe-81de-150a9042866b
- Type translation: https://mobbin.com/screens/ad38a902-90a9-4078-a50d-767ddf5a83c3
- Fill in the blank: https://mobbin.com/screens/e1a3317b-ed9a-4d60-9ea7-ef628b91aa7a
- Complete sentence (correct state): https://mobbin.com/screens/314d9ae8-c87d-4481-8a36-eef070d518a5
- Lesson complete (stat cards): https://mobbin.com/screens/f39bb209-7e44-4ec6-acf3-d5892a7e7571
- Streak (day 5 + calendar): https://mobbin.com/screens/f43117db-6103-4d88-a655-442f1f458f8b
