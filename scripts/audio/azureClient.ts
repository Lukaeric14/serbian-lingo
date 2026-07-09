// Thin wrapper around Azure AI Speech's REST text-to-speech endpoint.
//
// This talks to a real external API in production (SPEC.md §1: TTS = Azure AI
// Speech, sr-Latn-RS) and is deliberately NOT unit tested against the network —
// scripts/audio/generate.test.ts mocks this module entirely. It only needs to
// compile and be structurally correct.
//
// Credentials come from process.env.AZURE_SPEECH_KEY / AZURE_SPEECH_REGION,
// which live in a gitignored .env.local (loops/full-app/CONTEXT.md) and are
// NOT assumed to exist at import time — only read lazily, inside the call.

const LOCALE = "sr-Latn-RS";

class AzureSpeechConfigError extends Error {
  constructor(missingVar: string) {
    super(
      `${missingVar} is not set. Azure TTS requires AZURE_SPEECH_KEY and ` +
        `AZURE_SPEECH_REGION in a gitignored .env.local (see loops/full-app/CONTEXT.md).`,
    );
    this.name = "AzureSpeechConfigError";
  }
}

function getAzureConfig(): { key: string; region: string } {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;

  if (!key) throw new AzureSpeechConfigError("AZURE_SPEECH_KEY");
  if (!region) throw new AzureSpeechConfigError("AZURE_SPEECH_REGION");

  return { key, region };
}

function escapeSsml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSsml(text: string, voice: string): string {
  return (
    `<speak version="1.0" xml:lang="${LOCALE}">` +
    `<voice xml:lang="${LOCALE}" xml:gender="Neutral" name="${voice}">` +
    `${escapeSsml(text)}` +
    `</voice>` +
    `</speak>`
  );
}

/**
 * Synthesizes `text` (Serbian, Latin script) into MP3 audio using the given
 * Azure neural voice (e.g. "sr-RS-SophieNeural", "sr-RS-NicholasNeural").
 *
 * Resolves with the raw MP3 bytes as a Buffer. Rejects if credentials are
 * missing or the Azure REST call fails.
 */
export async function synthesizeSpeech(text: string, voice: string): Promise<Buffer> {
  const { key, region } = getAzureConfig();
  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
      "User-Agent": "serbian-lingo-audio-gen",
    },
    body: buildSsml(text, voice),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Azure TTS request failed (${response.status} ${response.statusText}): ${detail}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
