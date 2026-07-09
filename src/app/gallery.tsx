import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import {
  Button,
  Tile,
  OptionCard,
  FeedbackSheet,
  ProgressBar,
  PillLabel,
  SpeakerButton,
  SpeechBubble,
  StatCard,
  PathNode,
} from "@/components/ui";
import { colors, spacing, type } from "@/design/tokens";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

// Hidden dev-only screen (not part of the app's nav flow) — a side-by-side of every
// primitive in every state, for comparing against docs/ui-reference.md's Mobbin links.
export default function Gallery() {
  const [tileState, setTileState] = useState<"default" | "selected" | "ghost" | "correct" | "wrong">("default");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Design Gallery</Text>

      <Section title="Button">
        <Button variant="green" label="Check" onPress={() => {}} />
        <Button variant="blue" label="Continue" onPress={() => {}} />
        <Button variant="red" label="Got it" onPress={() => {}} />
        <Button variant="disabled" label="Check" />
      </Section>

      <Section title="Tile (tap to cycle state)">
        <Tile label="bread" state={tileState} onPress={() => {
          const order = ["default", "selected", "ghost", "correct", "wrong"] as const;
          setTileState(order[(order.indexOf(tileState) + 1) % order.length]);
        }} />
        <Tile label="default" state="default" onAudioTap={() => {}} />
        <Tile label="selected" state="selected" />
        <Tile label="ghost" state="ghost" />
        <Tile label="correct" state="correct" />
        <Tile label="wrong" state="wrong" />
      </Section>

      <Section title="OptionCard">
        <OptionCard label="default" state="default" />
        <OptionCard label="selected" state="selected" />
        <OptionCard label="correct" state="correct" />
        <OptionCard label="wrong" state="wrong" />
        <OptionCard label="with audio" state="default" onAudioTap={() => {}} />
      </Section>

      <Section title="FeedbackSheet — correct">
        <View style={styles.sheetWrap}>
          <FeedbackSheet variant="correct" heading="Nicely done!" onPrimaryPress={() => {}} />
        </View>
      </Section>
      <Section title="FeedbackSheet — wrong">
        <View style={styles.sheetWrap}>
          <FeedbackSheet
            variant="wrong"
            heading="Incorrect"
            correctAnswerText="Ovo je pas."
            meaningText="This is a dog."
            onPrimaryPress={() => {}}
          />
        </View>
      </Section>

      <Section title="ProgressBar">
        <View style={{ width: 280, gap: spacing.sm }}>
          <ProgressBar progress={0.2} />
          <ProgressBar progress={0.6} color={colors.blue} />
          <ProgressBar progress={1} color={colors.purple} />
        </View>
      </Section>

      <Section title="PillLabel">
        <PillLabel variant="new-word" />
        <PillLabel variant="hard-exercise" />
      </Section>

      <Section title="SpeakerButton">
        <SpeakerButton size="large" onPress={() => {}} />
        <SpeakerButton size="small" onPress={() => {}} />
        <SpeakerButton size="small" onPress={() => {}} isPlaying />
      </Section>

      <Section title="SpeechBubble">
        <View style={{ width: 300 }}>
          <SpeechBubble text="Dobar dan! Kako si?" avatarInitials="D" onAudioTap={() => {}} />
        </View>
      </Section>

      <Section title="StatCard">
        <StatCard variant="xp" label="Total XP" value="30" />
        <StatCard variant="time" label="Speedy" value="2:22" />
        <StatCard variant="accuracy" label="Amazing" value="100%" />
      </Section>

      <Section title="PathNode">
        <PathNode state="active" kind="lesson" color={colors.green} onPress={() => {}} />
        <PathNode state="completed" kind="lesson" color={colors.blue} onPress={() => {}} />
        <PathNode state="locked" kind="lesson" onPress={() => {}} />
        <PathNode state="completed" kind="chest" color={colors.gold} onPress={() => {}} />
        <PathNode state="locked" kind="practice" onPress={() => {}} />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.xl },
  pageTitle: { ...type.heading, color: colors.textDark },
  section: { gap: spacing.sm },
  sectionTitle: { ...type.title, color: colors.textDark },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, alignItems: "flex-start" },
  sheetWrap: { width: "100%", borderRadius: 12, overflow: "hidden" },
});
