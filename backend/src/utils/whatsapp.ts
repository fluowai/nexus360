export function normalizeWhatsAppPhone(input?: string | null) {
  const digits = String(input || "").replace(/\D/g, "");
  if (!digits) return { digits: "", e164: "", jid: "" };

  let normalized = digits;
  if (normalized.length === 10 || normalized.length === 11) {
    normalized = `55${normalized}`;
  }

  return {
    digits: normalized,
    e164: `+${normalized}`,
    jid: `${normalized}@s.whatsapp.net`,
  };
}

export function normalizeWhatsAppJid(input?: string | null) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (raw.includes("@")) return raw;
  return normalizeWhatsAppPhone(raw).jid;
}

export function isWhatsAppGroupJid(input?: string | null) {
  return normalizeWhatsAppJid(input).endsWith("@g.us");
}

export function isWhatsAppNewsletterJid(input?: string | null) {
  const jid = normalizeWhatsAppJid(input).toLowerCase();
  return jid.includes("@newsletter") || jid.endsWith("@broadcast");
}

export function pickWhatsAppDisplayName(payload: any) {
  return (
    payload?.group?.name ||
    payload?.displayName ||
    payload?.pushName ||
    payload?.senderPushName ||
    payload?.phone ||
    payload?.chatJid ||
    "Contato WhatsApp"
  );
}

export function mapWhatsAppMediaType(type?: string | null, mimeType?: string | null) {
  const mediaType = String(type || "").toLowerCase();
  const mime = String(mimeType || "").toLowerCase();

  if (mediaType.includes("image") || mime.startsWith("image/")) return "image";
  if (mediaType.includes("audio") || mime.startsWith("audio/")) return "audio";
  if (mediaType.includes("video") || mime.startsWith("video/")) return "video";
  if (mime.includes("pdf")) return "document";
  if (mediaType.includes("document") || mime) return "document";
  return "text";
}
