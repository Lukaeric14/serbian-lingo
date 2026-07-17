// Bumped manually on every push that Dominika needs to pick up over the Expo Go
// tunnel. Rendered as tiny gray text on the ProfilePicker and Path screens so
// "is she running the latest bundle?" is answerable by asking what number she
// sees, instead of guessing whether a reload actually happened. (Expo Go only
// picks up new code on a full app restart — fast refresh over the tunnel is
// unreliable, which burned us repeatedly during the audio-crash saga.)
export const APP_REVISION = "r6";
