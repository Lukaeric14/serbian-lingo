// Lesson-playing screen — the core gameplay loop (SPEC.md §4, §6).
//
// Flow: fetch this lesson's challenges (convex/lessons.ts:getLessonChallenges) -> build a
// LessonQueue (src/engine/queue.ts) -> render the current challenge via a per-type renderer
// from src/components/challenges -> grade the submitted answer (src/engine/grading.ts) ->
// show a FeedbackSheet -> on "Continue"/"Got it", advance the queue (which re-queues wrong
// answers to the end automatically) -> repeat until the queue reports the lesson complete ->
// record the completion in Convex and hand off to /lesson-complete with the stats.
//
// This screen is intentionally a thin host: it owns no grading/queueing logic of its own,
// it only wires the existing engine + renderers + primitives together.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View, Pressable, Modal } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import type { ComponentType } from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getSelectedProfileId } from "@/lib/selected-profile";
import { LessonQueue } from "@/engine/queue";
import { gradeChallenge } from "@/engine/grading";
import type { Challenge, ChallengeAnswer } from "@/engine/grading";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProgressBar, FeedbackSheet } from "@/components/ui";
import {
  TranslateBank,
  TranslateBankReverse,
  TranslateType,
  FillBlank,
  CompleteTranslation,
  MarkMeaning,
  MatchPairs,
  CompleteChat,
  ListenTap,
  ListenType,
} from "@/components/challenges";
import { colors, layout, spacing, type } from "@/design/tokens";

// One renderer per SPEC.md §4 challenge type. `any` props here because each renderer's
// `challenge`/`onSubmit` are narrowed to its own type-tagged union member (via
// `Extract<Challenge, {type: X}>`) — the lookup below is inherently type-erasing at this
// generic-dispatch boundary; the renderers themselves stay fully typed internally.
const CHALLENGE_RENDERERS: Record<Challenge["type"], ComponentType<any>> = {
  translate_bank: TranslateBank,
  translate_bank_reverse: TranslateBankReverse,
  translate_type: TranslateType,
  fill_blank: FillBlank,
  complete_translation: CompleteTranslation,
  mark_meaning: MarkMeaning,
  match_pairs: MatchPairs,
  complete_chat: CompleteChat,
  listen_tap: ListenTap,
  listen_type: ListenType,
};

interface ChallengeDoc {
  slug: string;
  order: number;
  type: Challenge["type"];
  payload: any;
}

type FeedbackState =
  | { visible: false }
  | {
      visible: true;
      correct: boolean;
      correctAnswerText?: string;
    };

/** Best-effort human-readable "correct answer" string for the wrong-feedback sheet. */
function correctAnswerTextFor(challenge: ChallengeDoc): string | undefined {
  switch (challenge.type) {
    case "translate_bank":
    case "translate_bank_reverse":
      return challenge.payload.correctAnswer;
    case "translate_type":
      return challenge.payload.correctAnswers?.[0];
    case "fill_blank":
      return challenge.payload.correctAnswer;
    case "complete_translation":
      return challenge.payload.correctAnswer;
    case "mark_meaning":
      return challenge.payload.options?.find((o: any) => o.correct)?.text;
    case "match_pairs":
      return undefined; // per-pair mismatches aren't a single "correct answer" string
    case "complete_chat":
      return challenge.payload.correctAnswer;
    case "listen_tap":
      return challenge.payload.audioText;
    case "listen_type":
      return challenge.payload.correctAnswer;
    default:
      return undefined;
  }
}

export default function LessonHost() {
  const { lessonSlug } = useLocalSearchParams<{ lessonSlug: string }>();
  const router = useRouter();

  const [profileId, setProfileId] = useState<Id<"profiles"> | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSelectedProfileId().then((id) => {
      if (!cancelled) {
        setProfileId(id);
        setProfileLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const challenges = useQuery(
    api.lessons.getLessonChallenges,
    lessonSlug ? { lessonSlug } : "skip",
  ) as ChallengeDoc[] | undefined;

  const recordCompletion = useMutation(api.completions.recordCompletion);

  // Queue is built once challenges arrive; kept in a ref-backed state so mutating it
  // in place (submit()) and re-rendering are both cheap and simple.
  const queueRef = useRef<LessonQueue | null>(null);
  const [queueVersion, setQueueVersion] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [firstAttemptCorrectCount, setFirstAttemptCorrectCount] = useState(0);
  const attemptedSlugsRef = useRef<Set<string>>(new Set());
  const startedAtRef = useRef<number>(Date.now());
  const [feedback, setFeedback] = useState<FeedbackState>({ visible: false });
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState(true);
  const [completing, setCompleting] = useState(false);

  const challengesBySlug = useMemo(() => {
    const map = new Map<string, ChallengeDoc>();
    for (const c of challenges ?? []) map.set(c.slug, c);
    return map;
  }, [challenges]);

  useEffect(() => {
    if (challenges && challenges.length > 0 && !queueRef.current) {
      const ordered = [...challenges].sort((a, b) => a.order - b.order);
      queueRef.current = new LessonQueue(ordered.map((c) => c.slug));
      startedAtRef.current = Date.now();
      setQueueVersion((v) => v + 1);
    }
  }, [challenges]);

  const currentSlug = queueRef.current?.current() ?? null;
  const currentChallenge = currentSlug ? challengesBySlug.get(currentSlug) ?? null : null;

  async function handleCompletion() {
    if (!profileId || completing) return;
    setCompleting(true);

    const totalAttempts = attemptedSlugsRef.current.size;
    const accuracy = totalAttempts > 0 ? firstAttemptCorrectCount / totalAttempts : 1;
    const xpEarned = 10 + (wrongCount === 0 ? 5 : 0);
    const durationSec = Math.round((Date.now() - startedAtRef.current) / 1000);

    const result = await recordCompletion({
      profileId,
      lessonSlug: lessonSlug as string,
      xpEarned,
      accuracy,
      durationSec,
    });

    router.push({
      pathname: "/lesson-complete",
      params: {
        xpEarned: String(result?.xpEarned ?? xpEarned),
        accuracy: String(accuracy),
        durationSec: String(durationSec),
        streak: String(result?.newStreak ?? ""),
        streakIsNew: String(result?.streakIsNew ?? false),
      },
    });
  }

  function handleSubmit(answer: ChallengeAnswer) {
    const queue = queueRef.current;
    const challenge = currentChallenge;
    if (!queue || !challenge) return;

    attemptedSlugsRef.current.add(challenge.slug);

    const gradeInput = { type: challenge.type, payload: challenge.payload } as Challenge;
    const result = gradeChallenge(gradeInput, answer);

    if (result.correct) {
      setFirstAttemptCorrectCount((n) => n + 1);
    } else {
      setWrongCount((n) => n + 1);
    }

    setLastAnswerCorrect(result.correct);
    setFeedback({
      visible: true,
      correct: result.correct,
      correctAnswerText: result.correct ? undefined : correctAnswerTextFor(challenge),
    });
  }

  function handleFeedbackPrimaryPress() {
    const queue = queueRef.current;
    if (!queue) return;

    queue.submit(lastAnswerCorrect);
    setFeedback({ visible: false });

    if (queue.isComplete()) {
      handleCompletion();
    } else {
      setQueueVersion((v) => v + 1);
    }
  }

  // --- Loading / error states ---

  if (!profileLoaded || challenges === undefined) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  if (!profileId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No profile selected.</Text>
      </View>
    );
  }

  if (!challenges || challenges.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>This lesson has no challenges.</Text>
      </View>
    );
  }

  if (!queueRef.current || !currentChallenge || completing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  const { correctCount, totalCount } = queueRef.current.progress();
  const Renderer = CHALLENGE_RENDERERS[currentChallenge.type];
  const rendererChallenge = {
    type: currentChallenge.type,
    payload: currentChallenge.payload,
  } as Challenge;

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Quit lesson"
          hitSlop={12}
        >
          <Text style={styles.quitGlyph}>✕</Text>
        </Pressable>
        <ProgressBar
          progress={totalCount > 0 ? correctCount / totalCount : 0}
          style={styles.progressBar}
        />
      </View>

      <View style={styles.body} key={currentChallenge.slug}>
        <Renderer challenge={rendererChallenge} onSubmit={handleSubmit} />
      </View>

      <Modal
        visible={feedback.visible}
        transparent
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View style={styles.modalBackdrop}>
          {feedback.visible ? (
            <FeedbackSheet
              variant={feedback.correct ? "correct" : "wrong"}
              heading={feedback.correct ? "Nicely done!" : "Incorrect"}
              correctAnswerText={feedback.correctAnswerText}
              onPrimaryPress={handleFeedbackPrimaryPress}
            />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  errorText: {
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize,
    color: colors.textMedium,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: layout.screenPaddingTop,
    paddingBottom: spacing.md,
  },
  quitGlyph: {
    fontFamily: type.title.fontFamily,
    fontSize: 20,
    color: colors.textMedium,
  },
  progressBar: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.15)",
  },
});
