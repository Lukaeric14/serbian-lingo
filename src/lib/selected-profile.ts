// Two profiles, no login (PRD.md) — the active profile is just an id persisted
// locally so it survives app restarts. Every screen that needs "the current
// profile" reads/writes through this module, not its own AsyncStorage calls,
// so the picker and every downstream screen agree on one source of truth.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Id } from "../../convex/_generated/dataModel";

const KEY = "serbian-lingo/selected-profile-id";

export async function getSelectedProfileId(): Promise<Id<"profiles"> | null> {
  const value = await AsyncStorage.getItem(KEY);
  return (value as Id<"profiles"> | null) ?? null;
}

export async function setSelectedProfileId(id: Id<"profiles">): Promise<void> {
  await AsyncStorage.setItem(KEY, id);
}

export async function clearSelectedProfileId(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
