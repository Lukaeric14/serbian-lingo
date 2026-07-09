# Challenge payload contract

Binding contract between content generation (SPEC.md's `generate-unit` step) and the
10 challenge renderers (SPEC.md §6). Every `challenges` document has `slug`, `lessonSlug`,
`order`, `type`, `payload` (shape below, per type), `newVocabSlugs` (vocab.slug[] first
introduced here). All Serbian strings inside `payload` MUST exactly match an `audioClips.text`
entry (surface form, not lemma) — that's what makes tap-to-hear and autoplay possible.

| type | payload shape |
|---|---|
| `translate_bank` | `{ promptText: string /* SR, audio */, correctAnswer: string /* EN */, wordBank: string[] /* EN words: correct + distractors, shuffled */ }` |
| `translate_bank_reverse` | `{ promptText: string /* EN */, correctAnswer: string /* SR, exact surface forms joined */, wordBank: string[] /* SR words: correct + distractors, shuffled, each individually audio-playable */ }` |
| `translate_type` | `{ promptText: string /* audio in whichever language is source */, direction: "sr_to_en" \| "en_to_sr", correctAnswers: string[] /* accepted answers, for typo/case tolerance */ }` |
| `fill_blank` | `{ sentenceBefore: string, sentenceAfter: string /* the two halves around the blank */, fullSentenceAudioText: string /* complete SR sentence w/ correct word, for audio */, correctAnswer: string, options: string[] /* correct + distractors */ }` |
| `complete_translation` | `{ sourceText: string /* SR, audio */, targetTemplate: string /* EN with "___" placeholder */, correctAnswer: string, options: string[] }` |
| `mark_meaning` | `{ promptText: string /* SR, audio */, options: { text: string, correct: boolean }[] /* 3 EN meanings, exactly 1 correct */ }` |
| `match_pairs` | `{ pairs: { sr: string, en: string }[] /* 5 pairs; sr must exist in audioClips */ }` |
| `complete_chat` | `{ dialogue: { speaker: string, text: string /* SR, audio */ }[] /* 2 bubbles */, promptQuestion: string /* EN */, options: string[], correctAnswer: string }` |
| `listen_tap` | `{ audioText: string /* SR word, audioClips kind:"word" */, options: string[] /* SR words, one === audioText */ }` |
| `listen_type` | `{ audioText: string /* SR word */, correctAnswer: string /* exact surface form; diacritic/typo tolerance is a grading-time concern, SPEC §4 — not baked into content */ }` |

Lesson-level shape (`data/units/unit-NN.json`): `{ unit: {...matches units table...}, lessons: [{ slug, order, kind: "lesson", challenges: [{...as above...}] }] }`.

Recognition→production ramp within a unit (SPEC §4): early lessons favor `translate_bank`, `match_pairs`, `listen_tap`, `mark_meaning`; later lessons favor `translate_bank_reverse`, `translate_type` (en_to_sr), `listen_type`, `complete_translation`.
