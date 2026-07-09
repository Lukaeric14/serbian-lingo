// One-off: synthesizes assets/audio/{correct,incorrect}.wav — short UI feedback
// chimes for the FeedbackSheet (SPEC.md §4/§6), played once per submitted answer
// (see src/audio/feedbackSounds.ts). Pure procedural sine-wave synthesis, no
// external assets or network calls — these are original tones, not a copy of any
// third-party sound.
//
// Usage: `npx tsx scripts/audio/generate-feedback-sounds.ts` (re-run any time to
// regenerate; deterministic given the constants below, nothing to fetch).
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const SAMPLE_RATE = 44100;
const OUT_DIR = join(__dirname, "..", "..", "assets", "audio");

interface Note {
  freq: number;
  durationMs: number;
  gain: number; // 0..1
}

/** Linear fade in/out envelope (ms) applied to a note so it doesn't click at the edges. */
const FADE_MS = 8;

function renderNote(note: Note): Float32Array {
  const n = Math.round((note.durationMs / 1000) * SAMPLE_RATE);
  const fadeSamples = Math.min(Math.round((FADE_MS / 1000) * SAMPLE_RATE), Math.floor(n / 2));
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let envelope = 1;
    if (i < fadeSamples) envelope = i / fadeSamples;
    else if (i > n - fadeSamples) envelope = (n - i) / fadeSamples;
    samples[i] = Math.sin(2 * Math.PI * note.freq * t) * note.gain * envelope;
  }
  return samples;
}

/** Concatenates notes back-to-back (each already fades to ~0 at its own edges). */
function renderSequence(notes: Note[]): Float32Array {
  const parts = notes.map(renderNote);
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Sums two notes of the same duration into one buffer — used for the buzzy "beat" fail tone. */
function renderChord(notes: Note[]): Float32Array {
  const rendered = notes.map(renderNote);
  const length = Math.max(...rendered.map((r) => r.length));
  const out = new Float32Array(length);
  for (const part of rendered) {
    for (let i = 0; i < part.length; i++) out[i] += part[i];
  }
  return out;
}

function floatTo16BitPcm(samples: Float32Array): Buffer {
  const buffer = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), i * 2);
  }
  return buffer;
}

function writeWav(filename: string, samples: Float32Array): void {
  const pcm = floatTo16BitPcm(samples);
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = SAMPLE_RATE * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  writeFileSync(join(OUT_DIR, filename), Buffer.concat([header, pcm]));
}

// Cheerful ascending two-note chime — A5 then C#6, matching the quick
// "ding-ding!" character of a positive-feedback sound.
const correct = renderSequence([
  { freq: 880.0, durationMs: 110, gain: 0.5 },
  { freq: 1108.73, durationMs: 170, gain: 0.5 },
]);

// Low buzzy tone — two close, slightly detuned frequencies summed to create
// a beating/buzzing texture, the classic "wrong answer" timbre.
const incorrect = renderChord([
  { freq: 196.0, durationMs: 260, gain: 0.4 },
  { freq: 207.65, durationMs: 260, gain: 0.4 },
]);

writeWav("correct.wav", correct);
writeWav("incorrect.wav", incorrect);
console.log(`Wrote ${OUT_DIR}/correct.wav and incorrect.wav`);
