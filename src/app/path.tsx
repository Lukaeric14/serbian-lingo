// Path screen — the classic Duolingo home: stat bar (streak + XP), colored unit
// banners, and a winding vertical path of lesson nodes. See docs/ui-reference.md
// screen anatomy §1 ("Home / learning path") and docs/SPEC.md §6.

import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";

import { PathNode } from "@/components/ui";
import { BoltIcon, FlameIcon } from "@/components/ui/icons";
import { colors, fonts, layout, radii, spacing, type } from "@/design/tokens";
import { getSelectedProfileId } from "@/lib/selected-profile";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// Alternating left/right offset for the winding-path look (sine-curve-ish, per
// ui-reference.md). Applied per node index across the whole path (not reset per unit)
// so the wind continues smoothly across unit banners.
const NODE_OFFSET = 48;

function offsetForIndex(index: number): number {
  const pattern = [0, 1, 2, 1, 0, -1, -2, -1];
  return pattern[index % pattern.length] * (NODE_OFFSET / 2);
}

export default function PathScreen() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<Id<"profiles"> | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getSelectedProfileId().then((id) => {
      if (cancelled) return;
      if (id === null) {
        router.replace("/");
        return;
      }
      setProfileId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const path = useQuery(
    api.path.getPath,
    profileId ? { profileId } : "skip",
  );

  // Profile not resolved yet, or redirecting to the picker.
  if (profileId === undefined || profileId === null) {
    return <SafeAreaView edges={["top"]} style={styles.container} />;
  }

  if (path === undefined) {
    return (
      <SafeAreaView edges={["top"]} style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>Loading…</Text>
      </SafeAreaView>
    );
  }

  // Streak/XP stat bar: v1 doesn't have a dedicated profile query on this contract,
  // so the stat bar shows today's progress toward the daily goal via completed-lesson
  // count as a simple stand-in count. Kept intentionally plain (Text/View), per brief.
  const totalLessons = path.reduce((sum, unit) => sum + unit.lessons.length, 0);
  const completedLessons = path.reduce(
    (sum, unit) => sum + unit.lessons.filter((l) => l.status === "completed").length,
    0,
  );

  let globalIndex = 0;

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.statBar}>
        <View style={styles.statItem}>
          <FlameIcon size={type.title.fontSize} />
          <Text style={styles.statValue}>{completedLessons}</Text>
        </View>
        <View style={styles.statItem}>
          <BoltIcon size={type.title.fontSize} />
          <Text style={styles.statValue}>
            {completedLessons}/{totalLessons}
          </Text>
        </View>
      </View>

      {path.map((unit) => (
        <View key={unit.slug} style={styles.unitBlock}>
          <View style={[styles.banner, { backgroundColor: unit.color }]}>
            <Text style={styles.bannerSection}>
              {unit.sectionTitle.toUpperCase()}, UNIT {unit.order}
            </Text>
            <Text style={styles.bannerTitle}>{unit.title}</Text>
          </View>

          <View style={styles.nodesWrap}>
            {unit.lessons.map((lesson) => {
              const offset = offsetForIndex(globalIndex);
              globalIndex += 1;
              return (
                <View
                  key={lesson.slug}
                  style={[styles.nodeRow, { transform: [{ translateX: offset }] }]}
                >
                  <PathNode
                    state={lesson.status}
                    kind={lesson.kind === "chest" ? "chest" : "lesson"}
                    color={unit.color}
                    onPress={
                      lesson.status === "active"
                        ? () => router.push(`/lesson/${lesson.slug}`)
                        : undefined
                    }
                  />
                </View>
              );
            })}
          </View>
        </View>
      ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundGray,
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: fonts.semiBold,
    fontSize: type.body.fontSize,
    color: colors.textMedium,
  },
  content: {
    paddingBottom: spacing.xxl * 2,
  },
  statBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xl,
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statValue: {
    fontFamily: fonts.extraBold,
    fontSize: type.title.fontSize,
    color: colors.textDark,
  },
  unitBlock: {
    marginBottom: spacing.lg,
  },
  banner: {
    paddingHorizontal: layout.screenPaddingH,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginHorizontal: layout.screenPaddingH,
    marginTop: layout.screenPaddingTop,
    marginBottom: spacing.xl,
  },
  bannerSection: {
    fontFamily: fonts.bold,
    fontSize: type.caption.fontSize,
    letterSpacing: type.caption.letterSpacing,
    color: colors.background,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  bannerTitle: {
    fontFamily: fonts.extraBold,
    fontSize: type.heading.fontSize,
    color: colors.background,
  },
  nodesWrap: {
    alignItems: "center",
    gap: spacing.xl,
  },
  nodeRow: {
    alignItems: "center",
  },
});
