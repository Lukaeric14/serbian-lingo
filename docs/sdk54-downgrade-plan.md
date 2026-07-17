# SDK 57 → 54 Downgrade Plan

**Why:** Expo Go on the App Store only supports SDK 54 right now (Apple hasn't approved the
SDK 57 client yet). Dominika needs to test on her iPhone tonight via Expo Go, and Apple ID
access for a real TestFlight build isn't available until tomorrow. Matching the project to
what her phone can actually run is the only same-night path.

## Verdict up front

Risk is **low-to-moderate and manageable** — lower than initially feared, for four concrete
reasons:

1. The one native crash we ever hit (expo-audio constructor arity) was caused by a JS/native
   *mismatch* — old JS package meeting a newer native module inside Expo Go 57. Downgrading
   everything coherently to 54 eliminates that class of bug rather than reintroducing it:
   Expo Go 54's native modules match expo-audio 1.1.x's JS exactly.
2. Verified directly against expo-audio@1.1.1's published type definitions: every API our
   audio code uses (`createAudioPlayer`, `replace`, `seekTo`, `remove`, `play`, `pause`)
   exists with compatible signatures. Our `player.ts`/`feedbackSounds.ts` need **zero changes**.
3. We have a real pre-flight verification path: `npx expo start` + pressing `i` auto-installs
   the matching Expo Go 54 client into the iOS simulator — the *same client version Dominika
   has* — so we can confirm everything (audio included) before sending her a link.
4. Rollback is one `git revert` + `npm install`. The backend (Convex) is completely
   independent of the Expo SDK — no schema/data/deploy changes involved at all.

Telling detail: the project's original `expo-audio: ~1.0.0` pin was an SDK-54-era version —
this codebase was effectively *born* on the SDK 54 toolchain and upgraded later.

## Exact version map (from expo@54.0.36's own bundledNativeModules.json)

| Package | Now (SDK 57) | Target (SDK 54) |
|---|---|---|
| expo | ~57.0.4 | 54.0.36 |
| expo-audio | ~57.0.0 | ~1.1.1 |
| expo-constants | ~57.0.3 | ~18.0.13 |
| expo-font | ~57.0.0 | ~14.0.12 |
| expo-linking | ~57.0.2 | ~8.0.12 |
| expo-router | ~57.0.4 | ~6.0.24 |
| expo-splash-screen | ~57.0.2 | ~31.0.13 |
| expo-status-bar | ~57.0.0 | ~3.0.9 |
| expo-system-ui | ~57.0.0 | ~6.0.9 |
| jest-expo | ~57.0.0 | ~54.0.17 |
| react / react-dom | 19.2.3 | 19.1.0 |
| react-native | 0.86.0 | 0.81.5 |
| react-native-svg | 15.15.4 | 15.12.1 |
| react-native-safe-area-context | ~5.7.0 | ~5.6.0 |
| react-native-screens | 4.25.2 | ~4.16.0 |
| react-native-gesture-handler | ~2.32.0 | ~2.28.0 |
| react-native-reanimated | 4.5.0 | ~4.1.1 |
| react-native-worklets | 0.10.0 | 0.5.1 |
| react-native-web | ~0.21.0 | ~0.21.0 (unchanged) |
| async-storage | 2.2.0 | 2.2.0 (unchanged) |

Plus: `react-test-renderer` and `@types/react` follow react to 19.1.x; `typescript` may need
~5.9.x (SDK 54's supported range) — `npx expo install --fix` decides.

## What is NOT affected (checked, not assumed)

- **Convex backend** — SDK-independent. No redeploy, no schema change, no data risk.
  Production deployment (adept-wolf-198) untouched.
- **All app code** — the APIs we use from every downgraded package (expo-router's
  Stack/useRouter/params, SafeAreaView, react-native-svg's Svg/Path, RN core Animated,
  expo-audio's player surface) are stable across both versions. Expect zero source edits.
- **app.json** — `expo.icon` (Icon Composer format) was introduced *in* SDK 54, so it's
  supported; `reactCompiler` and `typedRoutes` experiments both exist in 54; the expo-audio
  config plugin is harmless under Expo Go.
- **R2 audio URLs, seed data, EAS project linkage** — all untouched.
- **eas.json / TestFlight path** — SDK 54 builds fine on EAS whenever Apple ID access
  returns. Upgrading back to 57 later is *optional*, not required.

## Known risks (the honest list)

- **jest/RNTL churn**: @testing-library/react-native ^14 against React 19.1/RN 0.81 —
  probably fine, but the full 238-test suite is the gate; any failures get fixed before
  anything ships to her phone.
- **Transitive lockfile drift**: fresh `npm install` after big version moves can surface
  peer-dep warnings; resolved case-by-case, worst case `rm -rf node_modules package-lock.json`
  and clean install.
- **Runtime-only audio behavior**: unit tests mock expo-audio, so the real proof that audio
  plays is the simulator check in step 5 — that step is mandatory, not optional.

## Implementation steps

1. **Branch + edit**: on `main` (single atomic commit, revertable), set `expo` to `54.0.36`
   in package.json, then `npx expo install --fix` to realign every other package to the
   table above. Clean `npm install`.
2. **Static gates**: `npx tsc --noEmit` (root + convex tsconfig) and full `npx jest` —
   238/238 must pass. Fix anything that breaks before proceeding.
3. **Regenerate**: expo typed-routes regenerate on next `expo start`; confirm no stale
   `.expo/types` errors.
4. **Restart the tunnel**: kill the current `expo start --tunnel`, restart with the
   production Convex env vars (same command as before — the exp.direct URL should persist
   since it's derived from the stored urlRandomness).
5. **Verify in simulator with the REAL client** (the mandatory gate): `expo start` → press
   `i` → let it install the Expo Go 54 client into the simulator → walk one full lesson:
   word audio on tap, sentence autoplay, correct/incorrect chimes, CHECK layout, path pips.
6. **Ship**: send Dominika the same `exp://6qvoacw-lukaeric-8081.exp.direct` link.
7. **Commit + ledger**: one commit for the downgrade, LEDGER.md entry documenting why
   (Expo Go App Store lag) and the verification evidence.

**Rollback**: `git revert <commit> && npm install` — back on SDK 57 in ~2 minutes.

**Estimated time**: 20–30 min including the simulator walkthrough.

## After tonight

Stay on SDK 54 — it changes nothing for the TestFlight build, and it keeps Expo Go usable
as a fast test channel. Revisit upgrading to 57+ only when there's a feature/fix we actually
need from it (and do it as its own verified, single-commit change).
