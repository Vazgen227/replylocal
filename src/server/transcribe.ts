import type { Provider } from "../lib/omni-schemas";
import {
  ChannelFailure,
  metaVersion,
  providerRequest,
  type Credentials,
  type Media,
  type Settings,
} from "./channels";

/** Voice notes longer than this go to an operator untranscribed (cost guard). */
export const MAX_VOICE_SECONDS = 300;
const MAX_BYTES = 10 * 1024 * 1024;
export type Audio = { data: Uint8Array; filename: string; mime: string };
export type Transcriber = (audio: Audio) => Promise<string>;

async function download(url: string, init: RequestInit, fetcher: typeof fetch) {
  let response: Response;
  try {
    response = await fetcher(url, { ...init, signal: AbortSignal.timeout(20000) });
  } catch {
    throw new ChannelFailure("MEDIA_NETWORK");
  }
  if (!response.ok || !response.body) throw new ChannelFailure("MEDIA_HTTP_" + response.status);
  if (Number(response.headers.get("content-length")) > MAX_BYTES)
    throw new ChannelFailure("MEDIA_TOO_LARGE");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new ChannelFailure("MEDIA_TOO_LARGE");
    }
    chunks.push(value);
  }
  const data = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    data.set(c, offset);
    offset += c.byteLength;
  }
  return { data, mime: response.headers.get("content-type")?.split(";")[0].trim() ?? "" };
}

/**
 * Downloads a voice note from the provider. Only fixed official hosts are
 * contacted; a media URL returned by Meta must be on Meta's own CDN domains.
 */
export async function fetchVoice(
  provider: Provider,
  creds: Credentials,
  _settings: Settings,
  media: Media,
  fetcher: typeof fetch = fetch,
): Promise<Audio> {
  if (media.duration > MAX_VOICE_SECONDS) throw new ChannelFailure("VOICE_TOO_LONG");
  if (media.size > MAX_BYTES) throw new ChannelFailure("MEDIA_TOO_LARGE");
  if (provider === "telegram") {
    const file = await providerRequest(
      `https://api.telegram.org/bot${creds.accessToken}/getFile`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: media.id }),
      },
      fetcher,
    );
    const path = String(file.result?.file_path ?? "");
    if (!file.ok || !/^[\w\-/.]{1,200}$/.test(path) || path.includes(".."))
      throw new ChannelFailure("MEDIA_UNAVAILABLE");
    const { data, mime } = await download(
      `https://api.telegram.org/file/bot${creds.accessToken}/${path}`,
      {},
      fetcher,
    );
    const name = path.split("/").pop() || "voice.ogg";
    return { data, filename: /\.\w{2,4}$/.test(name) ? name : name + ".ogg", mime: mime || "audio/ogg" };
  }
  if (provider === "whatsapp") {
    const auth = { Authorization: `Bearer ${creds.accessToken}` };
    const info = await providerRequest(
      `https://graph.facebook.com/${metaVersion()}/${encodeURIComponent(media.id)}`,
      { headers: auth },
      fetcher,
    );
    let url: URL;
    try {
      url = new URL(String(info.url ?? ""));
    } catch {
      throw new ChannelFailure("MEDIA_UNAVAILABLE");
    }
    const trusted = [".fbsbx.com", ".facebook.com", ".whatsapp.net"].some((d) =>
      url.hostname.endsWith(d),
    );
    if (url.protocol !== "https:" || !trusted) throw new ChannelFailure("MEDIA_UNAVAILABLE");
    if (Number(info.file_size) > MAX_BYTES) throw new ChannelFailure("MEDIA_TOO_LARGE");
    const { data } = await download(url.href, { headers: auth }, fetcher);
    const mime = String(info.mime_type ?? "audio/ogg").split(";")[0].trim();
    const ext = mime.includes("mpeg") ? "mp3" : mime.includes("mp4") || mime.includes("aac") ? "m4a" : mime.includes("amr") ? "amr" : "ogg";
    return { data, filename: "voice." + ext, mime };
  }
  // Viber and Instagram do not hand voice notes to business bots.
  throw new ChannelFailure("MEDIA_UNSUPPORTED");
}

export function transcriptionConfigured() {
  return !!process.env.OPENAI_API_KEY;
}
/** OpenAI speech-to-text. The vocabulary hint improves car-service terms. */
export const openAITranscriber: Transcriber = async (audio) => {
  if (!transcriptionConfigured()) throw new Error("TRANSCRIPTION_NOT_CONFIGURED");
  const form = new FormData();
  form.append("file", new Blob([audio.data as BlobPart], { type: audio.mime || "audio/ogg" }), audio.filename);
  form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
  form.append(
    "prompt",
    "СТО, автосервис: ТО, замена масла, развал-схождение, ходовая, тормозные колодки, шиномонтаж, диагностика, пробег, госномер, VIN. СТО, автосервіс: ходова, гальма, пробіг.",
  );
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`TRANSCRIBE_HTTP_${response.status}`);
  const data = await response.json();
  return typeof data.text === "string" ? data.text : "";
};
