// ProfilePicker — "Who's learning?" (SPEC.md §6 screens list). PRD.md: two profiles,
// no login — Dominika's real profile plus a test profile for Luka so he never touches
// her streak. On mount, ensures the default profiles exist, then lists them as tappable
// cards; tapping one selects it and moves on to the learning path.

import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery } from "convex/react";

import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { setSelectedProfileId } from "@/lib/selected-profile";
import { ScreenContainer } from "@/components/ui";
import { BoltIcon, FlameIcon } from "@/components/ui/icons";
import { colors, radii, spacing, type } from "@/design/tokens";

export default function ProfilePicker() {
  const router = useRouter();
  const ensureDefaultProfiles = useMutation(api.profiles.ensureDefaultProfiles);
  const profiles = useQuery(api.profiles.listProfiles);

  useEffect(() => {
    ensureDefaultProfiles({});
    // Fire-and-forget on mount only — ensureDefaultProfiles is idempotent server-side,
    // so re-mounts (fast refresh, nav back here) are safe even without a dep array guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = async (profileId: Id<"profiles">) => {
    await setSelectedProfileId(profileId);
    router.replace("/path");
  };

  return (
    <ScreenContainer style={styles.container}>
      <Text style={styles.heading}>Who&apos;s learning?</Text>

      {profiles === undefined ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : (
        <View style={styles.list}>
          {profiles.map((profile) => (
            <ProfileCard
              key={profile._id}
              profile={profile}
              onPress={() => handleSelect(profile._id)}
            />
          ))}
        </View>
      )}
    </ScreenContainer>
  );
}

function ProfileCard({
  profile,
  onPress,
}: {
  profile: Doc<"profiles">;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <Text style={styles.name}>{profile.name}</Text>
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <FlameIcon size={type.body.fontSize} />
          <Text style={styles.statValue}>{profile.currentStreak}</Text>
        </View>
        <View style={styles.stat}>
          <BoltIcon size={type.body.fontSize} />
          <Text style={styles.statValue}>{profile.xpTotal} XP</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
  },
  heading: {
    fontFamily: type.heading.fontFamily,
    fontSize: type.heading.fontSize,
    color: colors.textDark,
  },
  loading: {
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize,
    color: colors.textMedium,
  },
  list: {
    width: "100%",
    gap: spacing.md,
  },
  card: {
    width: "100%",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderBottomColor: colors.borderDark,
    backgroundColor: colors.background,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  cardPressed: {
    backgroundColor: colors.backgroundGray,
  },
  name: {
    fontFamily: type.title.fontFamily,
    fontSize: type.title.fontSize,
    color: colors.textDark,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statValue: {
    fontFamily: type.body.fontFamily,
    fontSize: type.body.fontSize,
    color: colors.textMedium,
  },
});
